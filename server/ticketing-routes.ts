import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "./db";
import { 
  createHold, 
  extendHold, 
  releaseHold, 
  getActiveHolds, 
  getEventSeatStatuses,
  upgradeHoldToCheckout,
  cleanupExpiredHolds,
} from "./hold-service";
import { 
  seatHolds, 
  siaeTicketedEvents, 
  floorPlanSeats, 
  floorPlanZones,
  zoneMetrics,
  recommendationLogs,
  eventSeatStatus,
  seatHoldEvents,
  siaeTickets,
  siaeCustomers,
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { broadcastToEvent } from "./ticketing-websocket";

const router = Router();

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).isAuthenticated || !(req as any).isAuthenticated() || !(req as any).user) {
    return res.status(401).json({ success: false, error: "Non autenticato" });
  }
  next();
};

const holdRequestSchema = z.object({
  sectorId: z.string().optional(),
  seatId: z.string().optional(),
  zoneId: z.string().optional(),
  holdType: z.enum(['cart', 'checkout', 'staff_reserve']).optional(),
  quantity: z.number().min(1).max(20).optional(),
  priceSnapshot: z.string().optional(),
});

const extendHoldSchema = z.object({
  holdId: z.string(),
});

const releaseHoldSchema = z.object({
  holdId: z.string(),
});

const recommendationSchema = z.object({
  partySize: z.number().min(1).max(50).optional(),
  preferAccessible: z.boolean().optional(),
  preferredZoneType: z.enum(['table', 'sector', 'vip', 'general']).optional(),
  maxPrice: z.number().optional(),
});

function getSessionId(req: Request): string {
  if (req.session && (req.session as any).id) {
    return (req.session as any).id;
  }
  const clientId = req.headers['x-client-id'] as string;
  if (clientId) {
    return clientId;
  }
  return `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

router.post("/api/events/:eventId/seats/hold", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const validation = holdRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi", 
        details: validation.error.errors 
      });
    }

    const { sectorId, seatId, zoneId, holdType, quantity, priceSnapshot } = validation.data;

    if (!seatId && !zoneId) {
      return res.status(400).json({ 
        success: false, 
        error: "Devi specificare un posto (seatId) o una zona (zoneId)" 
      });
    }

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const sessionId = getSessionId(req);
    const userId = (req.user as any)?.id;
    const customerId = req.body.customerId;

    const result = await createHold({
      ticketedEventId: eventId,
      sessionId,
      sectorId,
      seatId,
      zoneId,
      customerId,
      userId,
      holdType,
      quantity,
      priceSnapshot,
    });

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
      sessionId,
    });
  } catch (error) {
    console.error("Error creating hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/extend", async (req: Request, res: Response) => {
  try {
    const validation = extendHoldSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { holdId } = validation.data;
    const sessionId = getSessionId(req);

    const result = await extendHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Error extending hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/release", async (req: Request, res: Response) => {
  try {
    const validation = releaseHoldSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { holdId } = validation.data;
    const sessionId = getSessionId(req);

    const result = await releaseHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error releasing hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.delete("/api/events/:eventId/seats/hold/:holdId", async (req: Request, res: Response) => {
  try {
    const { holdId } = req.params;
    const sessionId = getSessionId(req);

    const result = await releaseHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error releasing hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/upgrade-checkout", async (req: Request, res: Response) => {
  try {
    const { holdId } = req.body;
    
    if (!holdId) {
      return res.status(400).json({ 
        success: false, 
        error: "holdId richiesto" 
      });
    }

    const sessionId = getSessionId(req);
    const result = await upgradeHoldToCheckout(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Error upgrading hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/seats/status", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const statuses = await getEventSeatStatuses(eventId);

    res.json({
      success: true,
      seats: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting seat status:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/seats/my-holds", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const sessionId = getSessionId(req);

    const holds = await getActiveHolds(eventId, sessionId);

    res.json({
      success: true,
      holds,
      sessionId,
    });
  } catch (error) {
    console.error("Error getting my holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/heatmap", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const metrics = await db.select()
      .from(zoneMetrics)
      .where(eq(zoneMetrics.ticketedEventId, eventId));

    const seatStatuses = await db.select({
      zoneId: eventSeatStatus.zoneId,
      status: eventSeatStatus.status,
      count: sql<number>`count(*)`,
    })
      .from(eventSeatStatus)
      .where(eq(eventSeatStatus.ticketedEventId, eventId))
      .groupBy(eventSeatStatus.zoneId, eventSeatStatus.status);

    const heatmapData = metrics.map(m => ({
      zoneId: m.zoneId,
      totalCapacity: m.totalCapacity,
      available: m.availableCount,
      held: m.heldCount,
      sold: m.soldCount,
      blocked: m.blockedCount,
      occupancyPercent: Number(m.occupancyPercent),
      popularityScore: m.popularityScore,
      color: getHeatmapColor(Number(m.occupancyPercent)),
    }));

    res.json({
      success: true,
      heatmap: heatmapData,
      rawSeatStatuses: seatStatuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting heatmap:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

function getHeatmapColor(occupancyPercent: number): string {
  if (occupancyPercent >= 90) return '#ef4444';
  if (occupancyPercent >= 70) return '#f97316';
  if (occupancyPercent >= 50) return '#eab308';
  if (occupancyPercent >= 30) return '#84cc16';
  return '#22c55e';
}

router.post("/api/events/:eventId/recommendations", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const validation = recommendationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { partySize, preferAccessible, preferredZoneType, maxPrice } = validation.data;
    const sessionId = getSessionId(req);

    const availableZones = await db.query.zoneMetrics.findMany({
      where: and(
        eq(zoneMetrics.ticketedEventId, eventId),
        sql`${zoneMetrics.availableCount} >= ${partySize || 1}`
      ),
      orderBy: [desc(zoneMetrics.popularityScore)],
    });

    let filteredZones = availableZones;

    if (preferAccessible) {
      const accessibleZoneIds = await db.select({ id: floorPlanZones.id })
        .from(floorPlanZones)
        .where(eq(floorPlanZones.metadata, sql`'{"accessible": true}'::jsonb`));
      
      const accessibleIds = accessibleZoneIds.map(z => z.id);
      filteredZones = filteredZones.filter(z => accessibleIds.includes(z.zoneId));
    }

    const suggestedZones = filteredZones.slice(0, 3);

    await db.insert(recommendationLogs).values({
      ticketedEventId: eventId,
      sessionId,
      partySize,
      preferAccessible,
      preferredZoneType,
      maxPrice: maxPrice?.toString(),
      suggestedZoneIds: suggestedZones.map(z => z.zoneId),
    });

    res.json({
      success: true,
      recommendations: suggestedZones.map(z => ({
        zoneId: z.zoneId,
        availableSeats: z.availableCount,
        occupancyPercent: Number(z.occupancyPercent),
        popularityScore: z.popularityScore,
        reason: (z.popularityScore ?? 50) > 70 
          ? 'Zona molto popolare' 
          : z.availableCount > (partySize || 1) * 2 
            ? 'Ottima disponibilità' 
            : 'Buona posizione',
      })),
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/internal/cleanup-holds", async (req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredHolds();
    res.json({ success: true, cleaned: result.cleaned });
  } catch (error) {
    console.error("Error cleaning up holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// ================ OPERATIONAL MODE ENDPOINTS ================

router.get("/api/events/:eventId/operational-stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const seatCountResult = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(floorPlanSeats)
      .innerJoin(floorPlanZones, eq(floorPlanSeats.zoneId, floorPlanZones.id))
      .where(eq(floorPlanZones.floorPlanId, event.floorPlanId as string));

    const totalSeats = seatCountResult[0]?.count || event.totalCapacity || 0;

    const allStatuses = await db.select({
      status: eventSeatStatus.status,
      count: sql<number>`count(*)::int`,
    })
      .from(eventSeatStatus)
      .where(eq(eventSeatStatus.ticketedEventId, eventId))
      .groupBy(eventSeatStatus.status);

    const expiredHoldsResult = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(seatHolds)
      .where(and(
        eq(seatHolds.ticketedEventId, eventId),
        eq(seatHolds.status, 'expired')
      ));

    const statusCounts: Record<string, number> = {};
    allStatuses.forEach(s => {
      statusCounts[s.status] = s.count;
    });

    res.json({
      success: true,
      totalSeats,
      availableSeats: statusCounts['available'] || 0,
      soldSeats: statusCounts['sold'] || 0,
      heldSeats: statusCounts['held'] || 0,
      blockedSeats: statusCounts['blocked'] || 0,
      expiredHolds: expiredHoldsResult[0]?.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting operational stats:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/seats/:seatId/details", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { eventId, seatId } = req.params;

    const seatStatus = await db.query.eventSeatStatus.findFirst({
      where: and(
        eq(eventSeatStatus.ticketedEventId, eventId),
        eq(eventSeatStatus.seatId, seatId)
      ),
    });

    const seat = await db.query.floorPlanSeats.findFirst({
      where: eq(floorPlanSeats.id, seatId),
    });

    let zone = null;
    if (seat?.zoneId) {
      zone = await db.query.floorPlanZones.findFirst({
        where: eq(floorPlanZones.id, seat.zoneId),
      });
    }

    let holdInfo = null;
    let holdCustomerName = null;
    if (seatStatus?.currentHoldId) {
      holdInfo = await db.query.seatHolds.findFirst({
        where: eq(seatHolds.id, seatStatus.currentHoldId),
      });
      if (holdInfo?.customerId) {
        const customer = await db.query.siaeCustomers.findFirst({
          where: eq(siaeCustomers.id, holdInfo.customerId),
        });
        holdCustomerName = customer ? `${customer.firstName} ${customer.lastName}` : null;
      }
    }

    let ticketInfo = null;
    if (seatStatus?.status === 'sold') {
      const ticket = await db.query.siaeTickets.findFirst({
        where: and(
          eq(siaeTickets.ticketedEventId, eventId),
          eq(siaeTickets.seatId, seatId)
        ),
      });
      if (ticket) {
        let customerName = null;
        if (ticket.customerId) {
          const customer = await db.query.siaeCustomers.findFirst({
            where: eq(siaeCustomers.id, ticket.customerId),
          });
          customerName = customer ? `${customer.firstName} ${customer.lastName}` : null;
        }
        ticketInfo = {
          ticketNumber: ticket.ticketNumber,
          customerName,
          soldAt: ticket.createdAt,
          price: ticket.price,
        };
      }
    }

    const allHoldsForSeat = await db.select()
      .from(seatHolds)
      .where(and(
        eq(seatHolds.ticketedEventId, eventId),
        eq(seatHolds.seatId, seatId)
      ))
      .orderBy(desc(seatHolds.createdAt))
      .limit(10);

    const holdIds = allHoldsForSeat.map(h => h.id);
    let holdEventsHistory: any[] = [];
    if (holdIds.length > 0) {
      holdEventsHistory = await db.select()
        .from(seatHoldEvents)
        .where(inArray(seatHoldEvents.holdId, holdIds))
        .orderBy(desc(seatHoldEvents.createdAt))
        .limit(20);
    }

    res.json({
      success: true,
      seat: {
        id: seatId,
        row: seat?.row || 'N/A',
        number: seat?.seatNumber || 'N/A',
        seatLabel: seat?.seatLabel,
        isAccessible: seat?.isAccessible,
        zone: zone ? {
          id: zone.id,
          name: zone.name,
          type: zone.zoneType,
          color: zone.color,
        } : null,
      },
      status: seatStatus?.status || 'available',
      currentHold: holdInfo ? {
        holdId: holdInfo.id,
        holdType: holdInfo.holdType,
        expiresAt: holdInfo.expiresAt,
        sessionId: holdInfo.sessionId,
        customerName: holdCustomerName,
        createdAt: holdInfo.createdAt,
        extendedCount: holdInfo.extendedCount,
      } : null,
      ticketInfo,
      holdHistory: holdEventsHistory.map(e => ({
        id: e.id,
        holdId: e.holdId,
        eventType: e.eventType,
        previousStatus: e.previousStatus,
        newStatus: e.newStatus,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
    });
  } catch (error) {
    console.error("Error getting seat details:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/:seatId/block", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { eventId, seatId } = req.params;
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ success: false, error: "Il campo 'blocked' è obbligatorio (boolean)" });
    }

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const newStatus = blocked ? 'blocked' : 'available';

    await db.insert(eventSeatStatus).values({
      ticketedEventId: eventId,
      seatId,
      status: newStatus,
      currentHoldId: null,
      holdExpiresAt: null,
    }).onConflictDoUpdate({
      target: [eventSeatStatus.ticketedEventId, eventSeatStatus.seatId],
      set: {
        status: newStatus,
        currentHoldId: null,
        holdExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    if (blocked) {
      await db.update(seatHolds)
        .set({
          status: 'released',
          updatedAt: new Date(),
        })
        .where(and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.seatId, seatId),
          eq(seatHolds.status, 'active')
        ));
    }

    broadcastToEvent(eventId, 'seat_blocked', {
      seatId,
      status: newStatus,
      blocked,
    });

    res.json({
      success: true,
      seatId,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error blocking/unblocking seat:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

const forceReleaseSchema = z.object({
  holdId: z.string().optional(),
  seatId: z.string().optional(),
  force: z.boolean().optional(),
});

router.post("/api/events/:eventId/seats/force-release", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const validation = forceReleaseSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, error: "Dati non validi" });
    }

    const { holdId, seatId, force } = validation.data;

    if (!holdId && !seatId) {
      return res.status(400).json({ success: false, error: "Devi specificare holdId o seatId" });
    }

    let holdsToRelease: typeof seatHolds.$inferSelect[] = [];

    if (holdId) {
      const hold = await db.query.seatHolds.findFirst({
        where: and(
          eq(seatHolds.id, holdId),
          eq(seatHolds.ticketedEventId, eventId)
        ),
      });
      if (hold) holdsToRelease = [hold];
    } else if (seatId) {
      holdsToRelease = await db.select()
        .from(seatHolds)
        .where(and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.seatId, seatId),
          eq(seatHolds.status, 'active')
        ));
    }

    if (holdsToRelease.length === 0) {
      return res.status(404).json({ success: false, error: "Nessun hold trovato" });
    }

    for (const hold of holdsToRelease) {
      await db.update(seatHolds)
        .set({
          status: 'released',
          updatedAt: new Date(),
        })
        .where(eq(seatHolds.id, hold.id));

      if (hold.seatId) {
        await db.update(eventSeatStatus)
          .set({
            status: 'available',
            currentHoldId: null,
            holdExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
            eq(eventSeatStatus.seatId, hold.seatId)
          ));
      }

      if (hold.zoneId && !hold.seatId) {
        await db.update(eventSeatStatus)
          .set({
            status: 'available',
            currentHoldId: null,
            holdExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
            eq(eventSeatStatus.zoneId, hold.zoneId)
          ));
      }
    }

    res.json({
      success: true,
      releasedCount: holdsToRelease.length,
      holdIds: holdsToRelease.map(h => h.id),
    });
  } catch (error) {
    console.error("Error force releasing holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/all-holds", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    let whereClause = eq(seatHolds.ticketedEventId, eventId);
    
    if (status && typeof status === 'string') {
      whereClause = and(whereClause, eq(seatHolds.status, status)) as any;
    }

    const holds = await db.select()
      .from(seatHolds)
      .where(whereClause)
      .orderBy(desc(seatHolds.createdAt))
      .limit(100);

    res.json({
      success: true,
      holds: holds.map(h => ({
        id: h.id,
        seatId: h.seatId,
        zoneId: h.zoneId,
        sectorId: h.sectorId,
        status: h.status,
        holdType: h.holdType,
        sessionId: h.sessionId,
        customerId: h.customerId,
        userId: h.userId,
        expiresAt: h.expiresAt,
        createdAt: h.createdAt,
        quantity: h.quantity,
      })),
    });
  } catch (error) {
    console.error("Error getting all holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

export default router;
