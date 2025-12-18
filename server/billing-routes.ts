import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, between, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  organizerPlans,
  organizerSubscriptions,
  organizerCommissionProfiles,
  organizerWallets,
  organizerWalletLedger,
  organizerInvoices,
  organizerInvoiceItems,
  companies,
  insertOrganizerPlanSchema,
  insertOrganizerSubscriptionSchema,
  insertOrganizerCommissionProfileSchema,
} from "@shared/schema";
import {
  CommissionService,
  WalletService,
  BillingService,
  SubscriptionService,
} from "./billing-service";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autorizzato" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ message: "Accesso riservato ai Super Admin" });
  }
  next();
}

function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || (user.role !== "super_admin" && user.role !== "gestore")) {
    return res.status(403).json({ message: "Accesso riservato ai Gestori" });
  }
  next();
}

// ============================================================================
// ADMIN ENDPOINTS - Plans Management
// ============================================================================

router.get("/api/admin/billing/plans", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await db.select().from(organizerPlans).orderBy(desc(organizerPlans.createdAt));
    res.json(plans);
  } catch (error) {
    console.error("[Billing] Error fetching plans:", error);
    res.status(500).json({ message: "Errore nel recupero dei piani" });
  }
});

router.post("/api/admin/billing/plans", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const validated = insertOrganizerPlanSchema.parse(req.body);
    const [plan] = await db.insert(organizerPlans).values(validated).returning();
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error creating plan:", error);
    res.status(500).json({ message: "Errore nella creazione del piano" });
  }
});

router.put("/api/admin/billing/plans/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = insertOrganizerPlanSchema.partial().parse(req.body);
    
    const [plan] = await db
      .update(organizerPlans)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizerPlans.id, id))
      .returning();

    if (!plan) {
      return res.status(404).json({ message: "Piano non trovato" });
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error updating plan:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del piano" });
  }
});

router.delete("/api/admin/billing/plans/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [plan] = await db
      .update(organizerPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(organizerPlans.id, id))
      .returning();

    if (!plan) {
      return res.status(404).json({ message: "Piano non trovato" });
    }
    res.json({ message: "Piano disattivato", plan });
  } catch (error) {
    console.error("[Billing] Error deactivating plan:", error);
    res.status(500).json({ message: "Errore nella disattivazione del piano" });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Organizer Subscriptions
// ============================================================================

router.get("/api/admin/billing/organizers", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const allCompanies = await db.select().from(companies).where(eq(companies.active, true));

    const result = await Promise.all(
      allCompanies.map(async (company) => {
        const subscription = await SubscriptionService.getSubscription(company.id);
        const wallet = await WalletService.getOrCreateWallet(company.id);
        const commissionProfile = await CommissionService.getCommissionProfile(company.id);

        return {
          company,
          subscription,
          wallet: {
            id: wallet.id,
            balance: wallet.balance,
            thresholdAmount: wallet.thresholdAmount,
            currency: wallet.currency,
          },
          commissionProfile,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("[Billing] Error fetching organizers:", error);
    res.status(500).json({ message: "Errore nel recupero degli organizzatori" });
  }
});

router.get("/api/admin/billing/organizers/:companyId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const subscription = await SubscriptionService.getSubscription(companyId);
    const wallet = await WalletService.getOrCreateWallet(companyId);
    const commissionProfile = await CommissionService.getCommissionProfile(companyId);
    const invoices = await BillingService.getInvoicesByCompany(companyId);
    const ledgerEntries = await WalletService.getLedgerEntries(companyId, 50);

    let plan = null;
    if (subscription?.planId) {
      [plan] = await db.select().from(organizerPlans).where(eq(organizerPlans.id, subscription.planId)).limit(1);
    }

    res.json({
      company,
      subscription,
      plan,
      wallet,
      commissionProfile,
      invoices,
      recentLedgerEntries: ledgerEntries,
    });
  } catch (error) {
    console.error("[Billing] Error fetching organizer details:", error);
    res.status(500).json({ message: "Errore nel recupero dei dettagli" });
  }
});

router.post("/api/admin/billing/organizers/:companyId/subscription", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const validated = insertOrganizerSubscriptionSchema.parse({
      ...req.body,
      companyId,
    });

    const [subscription] = await db.insert(organizerSubscriptions).values(validated).returning();
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error creating subscription:", error);
    res.status(500).json({ message: "Errore nella creazione dell'abbonamento" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/subscription", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status, endDate } = req.body;

    const subscription = await SubscriptionService.getSubscription(companyId);
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (endDate) updateData.endDate = new Date(endDate);

    const [updated] = await db
      .update(organizerSubscriptions)
      .set(updateData)
      .where(eq(organizerSubscriptions.id, subscription.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[Billing] Error updating subscription:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento dell'abbonamento" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/commissions", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const existingProfile = await CommissionService.getCommissionProfile(companyId);

    if (existingProfile) {
      const [updated] = await db
        .update(organizerCommissionProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(organizerCommissionProfiles.id, existingProfile.id))
        .returning();
      return res.json(updated);
    }

    const validated = insertOrganizerCommissionProfileSchema.parse({
      ...req.body,
      companyId,
    });

    const [profile] = await db.insert(organizerCommissionProfiles).values(validated).returning();
    res.status(201).json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error updating commission profile:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del profilo commissioni" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/wallet-threshold", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { thresholdAmount } = req.body;

    if (typeof thresholdAmount !== "number" && typeof thresholdAmount !== "string") {
      return res.status(400).json({ message: "thresholdAmount richiesto" });
    }

    const wallet = await WalletService.getOrCreateWallet(companyId);

    const [updated] = await db
      .update(organizerWallets)
      .set({ thresholdAmount: String(thresholdAmount), updatedAt: new Date() })
      .where(eq(organizerWallets.id, wallet.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[Billing] Error updating wallet threshold:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della soglia wallet" });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Invoices
// ============================================================================

router.get("/api/admin/billing/invoices", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { status, from, to } = req.query;

    let query = db.select().from(organizerInvoices);

    const conditions = [];
    if (status && typeof status === "string") {
      conditions.push(eq(organizerInvoices.status, status));
    }
    if (from && typeof from === "string") {
      conditions.push(gte(organizerInvoices.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerInvoices.createdAt!, new Date(to)));
    }

    const invoices = conditions.length > 0
      ? await db.select().from(organizerInvoices).where(and(...conditions)).orderBy(desc(organizerInvoices.createdAt))
      : await db.select().from(organizerInvoices).orderBy(desc(organizerInvoices.createdAt));

    res.json(invoices);
  } catch (error) {
    console.error("[Billing] Error fetching invoices:", error);
    res.status(500).json({ message: "Errore nel recupero delle fatture" });
  }
});

router.post("/api/admin/billing/organizers/:companyId/invoices", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd, notes } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ message: "periodStart e periodEnd richiesti" });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const invoice = await BillingService.createInvoice({
      companyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      notes,
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("[Billing] Error creating invoice:", error);
    res.status(500).json({ message: "Errore nella creazione della fattura" });
  }
});

router.put("/api/admin/billing/invoices/:id/mark-paid", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await BillingService.markInvoicePaid(id);
    res.json(invoice);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invoice not found") {
        return res.status(404).json({ message: "Fattura non trovata" });
      }
      if (error.message === "Invoice already paid") {
        return res.status(400).json({ message: "Fattura già pagata" });
      }
    }
    console.error("[Billing] Error marking invoice paid:", error);
    res.status(500).json({ message: "Errore nel segnare la fattura come pagata" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Subscription
// ============================================================================

router.get("/api/organizer/billing/subscription", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const subscription = await SubscriptionService.getSubscription(companyId);
    if (!subscription) {
      return res.json(null);
    }

    let plan = null;
    if (subscription.planId) {
      [plan] = await db.select().from(organizerPlans).where(eq(organizerPlans.id, subscription.planId)).limit(1);
    }

    const eventsRemaining = await SubscriptionService.getEventsRemaining(companyId);
    const canCreate = await SubscriptionService.canCreateEvent(companyId);

    res.json({
      subscription,
      plan,
      eventsRemaining,
      canCreateEvent: canCreate,
    });
  } catch (error) {
    console.error("[Billing] Error fetching subscription:", error);
    res.status(500).json({ message: "Errore nel recupero dell'abbonamento" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Wallet & Ledger
// ============================================================================

router.get("/api/organizer/billing/wallet", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const wallet = await WalletService.getOrCreateWallet(companyId);
    const thresholdStatus = await WalletService.checkThreshold(companyId);

    res.json({
      wallet,
      thresholdStatus,
    });
  } catch (error) {
    console.error("[Billing] Error fetching wallet:", error);
    res.status(500).json({ message: "Errore nel recupero del wallet" });
  }
});

router.get("/api/organizer/billing/ledger", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const { from, to, event_id, limit: limitParam } = req.query;
    const limit = limitParam ? parseInt(limitParam as string) : 100;

    const conditions = [eq(organizerWalletLedger.companyId, companyId)];

    if (from && typeof from === "string") {
      conditions.push(gte(organizerWalletLedger.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerWalletLedger.createdAt!, new Date(to)));
    }
    if (event_id && typeof event_id === "string") {
      conditions.push(
        and(
          eq(organizerWalletLedger.referenceType, "event"),
          eq(organizerWalletLedger.referenceId, event_id)
        )!
      );
    }

    const entries = await db
      .select()
      .from(organizerWalletLedger)
      .where(and(...conditions))
      .orderBy(desc(organizerWalletLedger.createdAt))
      .limit(limit);

    res.json(entries);
  } catch (error) {
    console.error("[Billing] Error fetching ledger:", error);
    res.status(500).json({ message: "Errore nel recupero del ledger" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Invoices
// ============================================================================

router.get("/api/organizer/billing/invoices", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const invoices = await BillingService.getInvoicesByCompany(companyId);

    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice) => {
        const items = await db
          .select()
          .from(organizerInvoiceItems)
          .where(eq(organizerInvoiceItems.invoiceId, invoice.id));
        return { ...invoice, items };
      })
    );

    res.json(invoicesWithItems);
  } catch (error) {
    console.error("[Billing] Error fetching invoices:", error);
    res.status(500).json({ message: "Errore nel recupero delle fatture" });
  }
});

// ============================================================================
// REPORTS - Admin
// ============================================================================

router.get("/api/admin/billing/reports/sales", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { from, to, companyId, channel } = req.query;

    const conditions = [];

    if (companyId && typeof companyId === "string") {
      conditions.push(eq(organizerWalletLedger.companyId, companyId));
    }
    if (from && typeof from === "string") {
      conditions.push(gte(organizerWalletLedger.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerWalletLedger.createdAt!, new Date(to)));
    }
    if (channel && typeof channel === "string") {
      conditions.push(eq(organizerWalletLedger.channel, channel));
    }

    conditions.push(eq(organizerWalletLedger.type, "commission"));

    const entries = await db
      .select()
      .from(organizerWalletLedger)
      .where(and(...conditions))
      .orderBy(desc(organizerWalletLedger.createdAt));

    const summary = {
      totalCommissions: 0,
      byChannel: {
        online: { count: 0, total: 0 },
        printed: { count: 0, total: 0 },
        pr: { count: 0, total: 0 },
      } as Record<string, { count: number; total: number }>,
      entriesCount: entries.length,
    };

    for (const entry of entries) {
      const amount = Math.abs(parseFloat(entry.amount));
      summary.totalCommissions += amount;
      if (entry.channel && summary.byChannel[entry.channel]) {
        summary.byChannel[entry.channel].count++;
        summary.byChannel[entry.channel].total += amount;
      }
    }

    res.json({
      summary,
      entries,
    });
  } catch (error) {
    console.error("[Billing] Error generating sales report:", error);
    res.status(500).json({ message: "Errore nella generazione del report" });
  }
});

// ============================================================================
// REPORTS - Organizer
// ============================================================================

router.get("/api/organizer/billing/reports/sales", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const { from, to, channel } = req.query;

    const conditions = [
      eq(organizerWalletLedger.companyId, companyId),
      eq(organizerWalletLedger.type, "commission"),
    ];

    if (from && typeof from === "string") {
      conditions.push(gte(organizerWalletLedger.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerWalletLedger.createdAt!, new Date(to)));
    }
    if (channel && typeof channel === "string") {
      conditions.push(eq(organizerWalletLedger.channel, channel));
    }

    const entries = await db
      .select()
      .from(organizerWalletLedger)
      .where(and(...conditions))
      .orderBy(desc(organizerWalletLedger.createdAt));

    const summary = {
      totalCommissions: 0,
      byChannel: {
        online: { count: 0, total: 0 },
        printed: { count: 0, total: 0 },
        pr: { count: 0, total: 0 },
      } as Record<string, { count: number; total: number }>,
      entriesCount: entries.length,
    };

    for (const entry of entries) {
      const amount = Math.abs(parseFloat(entry.amount));
      summary.totalCommissions += amount;
      if (entry.channel && summary.byChannel[entry.channel]) {
        summary.byChannel[entry.channel].count++;
        summary.byChannel[entry.channel].total += amount;
      }
    }

    res.json({
      summary,
      entries,
    });
  } catch (error) {
    console.error("[Billing] Error generating sales report:", error);
    res.status(500).json({ message: "Errore nella generazione del report" });
  }
});

export default router;
