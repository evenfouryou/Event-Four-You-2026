import { Router, Request, Response } from 'express';
import { db } from './db';
import { 
  printerModels, printerAgents, printerProfiles, printJobs, cashierSessions,
  insertPrinterModelSchema, updatePrinterModelSchema,
  insertPrinterProfileSchema, updatePrinterProfileSchema,
  insertPrintJobSchema, insertCashierSessionSchema
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Type for authenticated user
interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyId?: string;
}

const router = Router();

// Helper to get authenticated user
function getUser(req: Request): AuthenticatedUser | null {
  return req.user as AuthenticatedUser | null;
}

// Middleware per verificare ruolo admin
function requireAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  next();
}

// Middleware per verificare ruolo cassiere o superiore
function requireCashierOrAbove(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore', 'cassiere'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  next();
}

// ==================== PRINTER MODELS (Admin only) ====================

// GET all printer models
router.get('/models', requireAdmin, async (req: Request, res: Response) => {
  try {
    const models = await db.select().from(printerModels).orderBy(desc(printerModels.createdAt));
    res.json(models);
  } catch (error) {
    console.error('Error fetching printer models:', error);
    res.status(500).json({ error: 'Errore nel recupero modelli stampante' });
  }
});

// POST create printer model
router.post('/models', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = insertPrinterModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [model] = await db.insert(printerModels).values(parsed.data).returning();
    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating printer model:', error);
    res.status(500).json({ error: 'Errore nella creazione modello stampante' });
  }
});

// PATCH update printer model
router.patch('/models/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updatePrinterModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [model] = await db.update(printerModels)
      .set(parsed.data)
      .where(eq(printerModels.id, id))
      .returning();
    
    if (!model) {
      return res.status(404).json({ error: 'Modello non trovato' });
    }
    res.json(model);
  } catch (error) {
    console.error('Error updating printer model:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento modello stampante' });
  }
});

// DELETE printer model
router.delete('/models/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(printerModels).where(eq(printerModels.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting printer model:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione modello stampante' });
  }
});

// ==================== PRINTER PROFILES (Per-company) ====================

// GET profiles for company
router.get('/profiles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId && user?.role !== 'super_admin') {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    let query = db.select().from(printerProfiles);
    if (companyId) {
      query = query.where(eq(printerProfiles.companyId, companyId)) as any;
    }
    
    const profiles = await query.orderBy(desc(printerProfiles.createdAt));
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching printer profiles:', error);
    res.status(500).json({ error: 'Errore nel recupero profili stampante' });
  }
});

// POST create profile
router.post('/profiles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    const parsed = insertPrinterProfileSchema.safeParse({ ...req.body, companyId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [profile] = await db.insert(printerProfiles).values(parsed.data).returning();
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating printer profile:', error);
    res.status(500).json({ error: 'Errore nella creazione profilo stampante' });
  }
});

// PATCH update profile
router.patch('/profiles/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updatePrinterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [profile] = await db.update(printerProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(printerProfiles.id, id))
      .returning();
    
    if (!profile) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error updating printer profile:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento profilo stampante' });
  }
});

// DELETE profile
router.delete('/profiles/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(printerProfiles).where(eq(printerProfiles.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting printer profile:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione profilo stampante' });
  }
});

// ==================== PRINTER AGENTS ====================

// GET agents for company
router.get('/agents', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    let query = db.select().from(printerAgents);
    if (companyId) {
      query = query.where(eq(printerAgents.companyId, companyId)) as any;
    }
    
    const agents = await query.orderBy(desc(printerAgents.lastHeartbeat));
    res.json(agents);
  } catch (error) {
    console.error('Error fetching printer agents:', error);
    res.status(500).json({ error: 'Errore nel recupero agenti stampante' });
  }
});

// POST register agent (called by desktop app)
router.post('/agents/register', async (req: Request, res: Response) => {
  try {
    const { companyId, deviceName, printerModelId, printerName, capabilities } = req.body;
    
    if (!companyId || !deviceName) {
      return res.status(400).json({ error: 'companyId e deviceName richiesti' });
    }
    
    // Generate auth token
    const authToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(authToken).digest('hex');
    
    // Check if agent already exists
    const existing = await db.select().from(printerAgents)
      .where(and(
        eq(printerAgents.companyId, companyId),
        eq(printerAgents.deviceName, deviceName)
      ))
      .limit(1);
    
    let agent;
    if (existing.length > 0) {
      // Update existing
      [agent] = await db.update(printerAgents)
        .set({
          authToken: hashedToken,
          printerModelId,
          printerName,
          capabilities,
          status: 'online',
          lastHeartbeat: new Date(),
          updatedAt: new Date()
        })
        .where(eq(printerAgents.id, existing[0].id))
        .returning();
    } else {
      // Create new
      [agent] = await db.insert(printerAgents).values({
        companyId,
        deviceName,
        authToken: hashedToken,
        printerModelId,
        printerName,
        capabilities,
        status: 'online',
        lastHeartbeat: new Date()
      }).returning();
    }
    
    // Return unhashed token to agent (only time it's visible)
    res.status(201).json({ ...agent, authToken });
  } catch (error) {
    console.error('Error registering printer agent:', error);
    res.status(500).json({ error: 'Errore nella registrazione agente stampante' });
  }
});

// PATCH heartbeat from agent
router.patch('/agents/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, capabilities } = req.body;
    
    const [agent] = await db.update(printerAgents)
      .set({
        status: status || 'online',
        capabilities,
        lastHeartbeat: new Date(),
        updatedAt: new Date()
      })
      .where(eq(printerAgents.id, id))
      .returning();
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trovato' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent heartbeat:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento heartbeat' });
  }
});

// ==================== PRINT JOBS ====================

// GET pending jobs for agent
router.get('/jobs/pending/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    const jobs = await db.select().from(printJobs)
      .where(and(
        eq(printJobs.agentId, agentId),
        eq(printJobs.status, 'pending')
      ))
      .orderBy(printJobs.createdAt);
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching pending jobs:', error);
    res.status(500).json({ error: 'Errore nel recupero lavori in attesa' });
  }
});

// POST create print job
router.post('/jobs', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    const parsed = insertPrintJobSchema.safeParse({
      ...req.body,
      companyId,
      createdBy: user?.id
    });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [job] = await db.insert(printJobs).values(parsed.data).returning();
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Errore nella creazione lavoro di stampa' });
  }
});

// PATCH update job status
router.patch('/jobs/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, errorMessage } = req.body;
    
    const updates: any = { status };
    if (status === 'completed') {
      updates.printedAt = new Date();
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
    
    const [job] = await db.update(printJobs)
      .set(updates)
      .where(eq(printJobs.id, id))
      .returning();
    
    if (!job) {
      return res.status(404).json({ error: 'Job non trovato' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento stato lavoro' });
  }
});

// ==================== CASHIER SESSIONS ====================

// GET active session for user
router.get('/cashier/session', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    
    const sessions = await db.select().from(cashierSessions)
      .where(and(
        eq(cashierSessions.userId, userId),
        eq(cashierSessions.status, 'active')
      ))
      .limit(1);
    
    res.json(sessions[0] || null);
  } catch (error) {
    console.error('Error fetching cashier session:', error);
    res.status(500).json({ error: 'Errore nel recupero sessione cassa' });
  }
});

// POST open cashier session
router.post('/cashier/session', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    const userId = user?.id;
    
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Company ID e User ID richiesti' });
    }
    
    const { eventId, printerAgentId } = req.body;
    
    const [session] = await db.insert(cashierSessions).values({
      companyId,
      userId,
      eventId,
      printerAgentId,
      status: 'active'
    }).returning();
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating cashier session:', error);
    res.status(500).json({ error: 'Errore nell\'apertura sessione cassa' });
  }
});

// PATCH close cashier session
router.patch('/cashier/session/:id/close', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, ticketsIssued, totalAmount } = req.body;
    
    const [session] = await db.update(cashierSessions)
      .set({
        status: 'closed',
        closedAt: new Date(),
        notes,
        ticketsIssued,
        totalAmount
      })
      .where(eq(cashierSessions.id, id))
      .returning();
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error closing cashier session:', error);
    res.status(500).json({ error: 'Errore nella chiusura sessione cassa' });
  }
});

// GET cashier sessions history
router.get('/cashier/sessions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    let query = db.select().from(cashierSessions);
    if (companyId) {
      query = query.where(eq(cashierSessions.companyId, companyId)) as any;
    }
    
    const sessions = await query.orderBy(desc(cashierSessions.openedAt));
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching cashier sessions:', error);
    res.status(500).json({ error: 'Errore nel recupero storico sessioni cassa' });
  }
});

export default router;
