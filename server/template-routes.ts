import { Router, Request, Response } from 'express';
import { db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import {
  ticketTemplates,
  ticketTemplateElements,
  insertTicketTemplateSchema,
  insertTicketTemplateElementSchema,
} from '@shared/schema';

const router = Router();

function getUser(req: Request) {
  return (req as any).user;
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato - solo admin' });
  }
  next();
}

// ==================== TICKET TEMPLATES ====================

// GET all templates for company
router.get('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    
    let query = db.select().from(ticketTemplates);
    if (companyId && user.role !== 'super_admin') {
      query = query.where(eq(ticketTemplates.companyId, companyId)) as any;
    }
    
    const templates = await query.orderBy(desc(ticketTemplates.createdAt));
    res.json(templates);
  } catch (error) {
    console.error('Error fetching ticket templates:', error);
    res.status(500).json({ error: 'Errore nel recupero template' });
  }
});

// GET single template with elements
router.get('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    // Check company access
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const elements = await db.select().from(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, id))
      .orderBy(ticketTemplateElements.zIndex);
    
    res.json({ ...template, elements });
  } catch (error) {
    console.error('Error fetching ticket template:', error);
    res.status(500).json({ error: 'Errore nel recupero template' });
  }
});

// POST create template
router.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const validated = insertTicketTemplateSchema.parse(req.body);
    
    // Use user's company if not super_admin
    const companyId = user.role === 'super_admin' 
      ? (validated.companyId || user.companyId)
      : user.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId richiesto' });
    }
    
    const [template] = await db.insert(ticketTemplates).values({
      ...validated,
      companyId,
    }).returning();
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating ticket template:', error);
    res.status(500).json({ error: 'Errore nella creazione template' });
  }
});

// PATCH update template
router.patch('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    // Check ownership
    const [existing] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && existing.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const [template] = await db.update(ticketTemplates)
      .set({
        ...req.body,
        updatedAt: new Date(),
        version: (existing.version || 1) + 1,
      })
      .where(eq(ticketTemplates.id, id))
      .returning();
    
    res.json(template);
  } catch (error) {
    console.error('Error updating ticket template:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento template' });
  }
});

// DELETE template
router.delete('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    // Check ownership
    const [existing] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && existing.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Elements are deleted via CASCADE
    await db.delete(ticketTemplates).where(eq(ticketTemplates.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket template:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione template' });
  }
});

// ==================== TEMPLATE ELEMENTS ====================

// POST add element to template
router.post('/templates/:templateId/elements', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const validated = insertTicketTemplateElementSchema.parse({
      ...req.body,
      templateId,
    });
    
    const [element] = await db.insert(ticketTemplateElements).values(validated).returning();
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.status(201).json(element);
  } catch (error) {
    console.error('Error creating template element:', error);
    res.status(500).json({ error: 'Errore nella creazione elemento' });
  }
});

// PATCH update element
router.patch('/templates/:templateId/elements/:elementId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, elementId } = req.params;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const [element] = await db.update(ticketTemplateElements)
      .set(req.body)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ))
      .returning();
    
    if (!element) {
      return res.status(404).json({ error: 'Elemento non trovato' });
    }
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.json(element);
  } catch (error) {
    console.error('Error updating template element:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento elemento' });
  }
});

// DELETE element
router.delete('/templates/:templateId/elements/:elementId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, elementId } = req.params;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    await db.delete(ticketTemplateElements)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ));
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template element:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione elemento' });
  }
});

// POST bulk update elements (for save all at once from editor)
router.post('/templates/:templateId/elements/bulk', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { elements } = req.body;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Delete existing elements and replace with new ones
    await db.delete(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, templateId));
    
    if (elements && elements.length > 0) {
      const elementsWithTemplateId = elements.map((el: any) => ({
        ...el,
        templateId,
        id: undefined, // Let DB generate new IDs
      }));
      
      await db.insert(ticketTemplateElements).values(elementsWithTemplateId);
    }
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    // Fetch updated elements
    const updatedElements = await db.select().from(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, templateId))
      .orderBy(ticketTemplateElements.zIndex);
    
    res.json({ success: true, elements: updatedElements });
  } catch (error) {
    console.error('Error bulk updating template elements:', error);
    res.status(500).json({ error: 'Errore nel salvataggio elementi' });
  }
});

export default router;
