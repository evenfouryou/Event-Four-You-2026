import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertDigitalTicketTemplateSchema } from "@shared/schema";

const router = Router();

const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  next();
};

const requireGestore = (req: Request, res: Response, next: Function) => {
  const user = req.user as any;
  if (!["super_admin", "gestore"].includes(user?.role)) {
    return res.status(403).json({ message: "Accesso non autorizzato" });
  }
  next();
};

router.get("/api/digital-templates", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.role === "super_admin" ? undefined : user.companyId;
    const templates = await storage.getDigitalTicketTemplates(companyId);
    res.json(templates);
  } catch (error) {
    console.error("[Digital Templates] Error fetching templates:", error);
    res.status(500).json({ message: "Errore nel recupero dei template" });
  }
});

router.get("/api/digital-templates/default/:companyId?", async (req: Request, res: Response) => {
  try {
    const template = await storage.getDefaultDigitalTicketTemplate(req.params.companyId);
    res.json(template || null);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero del template" });
  }
});

router.get("/api/digital-templates/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const template = await storage.getDigitalTicketTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero del template" });
  }
});

router.post("/api/digital-templates", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = insertDigitalTicketTemplateSchema.parse(req.body);
    
    // Global templates (companyId = null/undefined) can only be created by super_admin
    if (!data.companyId && user.role !== "super_admin") {
      return res.status(403).json({ message: "Solo super admin può creare template globali" });
    }
    
    // Non super_admin can only create templates for their own company
    if (user.role !== "super_admin" && data.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non puoi creare template per altre aziende" });
    }
    
    const template = await storage.createDigitalTicketTemplate(data);
    res.status(201).json(template);
  } catch (error: any) {
    console.error("[Digital Templates] Error creating template:", error);
    res.status(400).json({ message: error.message || "Errore nella creazione del template" });
  }
});

router.patch("/api/digital-templates/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const existing = await storage.getDigitalTicketTemplate(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    // Global templates (companyId = null) can only be modified by super_admin
    if (!existing.companyId && user.role !== "super_admin") {
      return res.status(403).json({ message: "Solo super admin può modificare template globali" });
    }
    
    // Non super_admin can only modify templates for their own company
    if (existing.companyId && user.role !== "super_admin" && existing.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non puoi modificare questo template" });
    }
    
    const template = await storage.updateDigitalTicketTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Errore nell'aggiornamento del template" });
  }
});

router.delete("/api/digital-templates/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const existing = await storage.getDigitalTicketTemplate(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    if (!existing.companyId && user.role !== "super_admin") {
      return res.status(403).json({ message: "Solo super admin può eliminare template globali" });
    }
    
    if (existing.companyId && user.role !== "super_admin" && existing.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non puoi eliminare questo template" });
    }
    
    await storage.deleteDigitalTicketTemplate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Errore nell'eliminazione del template" });
  }
});

export default router;
