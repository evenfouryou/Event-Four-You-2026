import { db } from './db';
import { eq, and, between, sql, desc } from 'drizzle-orm';
import {
  organizerSubscriptions,
  organizerCommissionProfiles,
  organizerWallets,
  organizerWalletLedger,
  organizerInvoices,
  organizerInvoiceItems,
  type OrganizerSubscription,
  type OrganizerWallet,
  type OrganizerWalletLedger,
  type OrganizerInvoice,
} from '@shared/schema';

export class CommissionService {
  static calculateCommission(
    channel: 'online' | 'printed' | 'pr',
    ticketPriceGross: number,
    profile: {
      channelOnlineType: string | null;
      channelOnlineValue: string | null;
      channelPrintedType: string | null;
      channelPrintedValue: string | null;
      channelPrType: string | null;
      channelPrValue: string | null;
    }
  ): number {
    let type: string | null;
    let valueStr: string | null;

    switch (channel) {
      case 'online':
        type = profile.channelOnlineType;
        valueStr = profile.channelOnlineValue;
        break;
      case 'printed':
        type = profile.channelPrintedType;
        valueStr = profile.channelPrintedValue;
        break;
      case 'pr':
        type = profile.channelPrType;
        valueStr = profile.channelPrValue;
        break;
    }

    if (!type || !valueStr) {
      return 0;
    }

    const value = parseFloat(valueStr);
    if (isNaN(value) || value < 0) {
      return 0;
    }

    if (type === 'percent') {
      if (value > 100) {
        return ticketPriceGross;
      }
      return Math.round(ticketPriceGross * (value / 100) * 100) / 100;
    } else {
      return Math.round(value * 100) / 100;
    }
  }

  static async getCommissionProfile(companyId: string) {
    const [profile] = await db
      .select()
      .from(organizerCommissionProfiles)
      .where(eq(organizerCommissionProfiles.companyId, companyId))
      .limit(1);
    return profile || null;
  }
}

export class WalletService {
  static async getOrCreateWallet(companyId: string): Promise<OrganizerWallet> {
    const [existingWallet] = await db
      .select()
      .from(organizerWallets)
      .where(eq(organizerWallets.companyId, companyId))
      .limit(1);

    if (existingWallet) {
      return existingWallet;
    }

    const [newWallet] = await db
      .insert(organizerWallets)
      .values({
        companyId,
        balance: '0',
        thresholdAmount: '1000',
        currency: 'EUR',
        isActive: true,
      })
      .returning();

    return newWallet;
  }

  static async addLedgerEntry(params: {
    companyId: string;
    walletId: string;
    type: 'commission' | 'subscription' | 'invoice' | 'payment' | 'adjustment';
    direction: 'debit' | 'credit';
    amount: number;
    referenceType?: 'order' | 'event' | 'invoice' | 'subscription';
    referenceId?: string;
    channel?: 'online' | 'printed' | 'pr';
    note?: string;
  }): Promise<OrganizerWalletLedger> {
    const wallet = await this.getOrCreateWallet(params.companyId);
    const currentBalance = parseFloat(wallet.balance);
    
    const balanceChange = params.direction === 'debit' 
      ? -Math.abs(params.amount) 
      : Math.abs(params.amount);
    
    const newBalance = currentBalance + balanceChange;

    await db
      .update(organizerWallets)
      .set({ 
        balance: newBalance.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(organizerWallets.id, params.walletId));

    const [ledgerEntry] = await db
      .insert(organizerWalletLedger)
      .values({
        companyId: params.companyId,
        walletId: params.walletId,
        type: params.type,
        direction: params.direction,
        amount: params.amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        channel: params.channel,
        note: params.note,
      })
      .returning();

    return ledgerEntry;
  }

  static async checkThreshold(companyId: string): Promise<{
    exceedsThreshold: boolean;
    balance: number;
    threshold: number;
  }> {
    const wallet = await this.getOrCreateWallet(companyId);
    const balance = parseFloat(wallet.balance);
    const threshold = parseFloat(wallet.thresholdAmount);

    return {
      exceedsThreshold: balance < 0 && Math.abs(balance) >= threshold,
      balance,
      threshold,
    };
  }

  static async getWalletBalance(companyId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(companyId);
    return parseFloat(wallet.balance);
  }

  static async getLedgerEntries(companyId: string, limit = 100): Promise<OrganizerWalletLedger[]> {
    return db
      .select()
      .from(organizerWalletLedger)
      .where(eq(organizerWalletLedger.companyId, companyId))
      .orderBy(desc(organizerWalletLedger.createdAt))
      .limit(limit);
  }
}

export class BillingService {
  static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  static async createInvoice(params: {
    companyId: string;
    periodStart: Date;
    periodEnd: Date;
    notes?: string;
  }): Promise<OrganizerInvoice> {
    const wallet = await WalletService.getOrCreateWallet(params.companyId);

    const ledgerEntries = await db
      .select()
      .from(organizerWalletLedger)
      .where(
        and(
          eq(organizerWalletLedger.companyId, params.companyId),
          eq(organizerWalletLedger.direction, 'debit'),
          between(organizerWalletLedger.createdAt!, params.periodStart, params.periodEnd)
        )
      );

    const commissionsByChannel: Record<string, { count: number; total: number }> = {
      online: { count: 0, total: 0 },
      printed: { count: 0, total: 0 },
      pr: { count: 0, total: 0 },
    };

    let subscriptionTotal = 0;
    let adjustmentTotal = 0;

    for (const entry of ledgerEntries) {
      const amount = Math.abs(parseFloat(entry.amount));
      
      if (entry.type === 'commission' && entry.channel) {
        commissionsByChannel[entry.channel].count++;
        commissionsByChannel[entry.channel].total += amount;
      } else if (entry.type === 'subscription') {
        subscriptionTotal += amount;
      } else if (entry.type === 'adjustment') {
        adjustmentTotal += amount;
      }
    }

    const totalAmount = 
      commissionsByChannel.online.total +
      commissionsByChannel.printed.total +
      commissionsByChannel.pr.total +
      subscriptionTotal +
      adjustmentTotal;

    const invoiceNumber = this.generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const [invoice] = await db
      .insert(organizerInvoices)
      .values({
        companyId: params.companyId,
        invoiceNumber,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        amount: totalAmount.toFixed(2),
        status: 'issued',
        issuedAt: new Date(),
        dueDate,
        notes: params.notes,
      })
      .returning();

    const invoiceItems = [];

    if (subscriptionTotal > 0) {
      invoiceItems.push({
        invoiceId: invoice.id,
        itemType: 'subscription',
        description: 'Canone abbonamento',
        quantity: 1,
        unitPrice: subscriptionTotal.toFixed(2),
        amount: subscriptionTotal.toFixed(2),
      });
    }

    if (commissionsByChannel.online.total > 0) {
      invoiceItems.push({
        invoiceId: invoice.id,
        itemType: 'commissions_online',
        description: `Commissioni vendite online (${commissionsByChannel.online.count} transazioni)`,
        quantity: commissionsByChannel.online.count,
        unitPrice: (commissionsByChannel.online.total / commissionsByChannel.online.count).toFixed(2),
        amount: commissionsByChannel.online.total.toFixed(2),
      });
    }

    if (commissionsByChannel.printed.total > 0) {
      invoiceItems.push({
        invoiceId: invoice.id,
        itemType: 'commissions_printed',
        description: `Commissioni vendite biglietteria (${commissionsByChannel.printed.count} transazioni)`,
        quantity: commissionsByChannel.printed.count,
        unitPrice: (commissionsByChannel.printed.total / commissionsByChannel.printed.count).toFixed(2),
        amount: commissionsByChannel.printed.total.toFixed(2),
      });
    }

    if (commissionsByChannel.pr.total > 0) {
      invoiceItems.push({
        invoiceId: invoice.id,
        itemType: 'commissions_pr',
        description: `Commissioni vendite PR (${commissionsByChannel.pr.count} transazioni)`,
        quantity: commissionsByChannel.pr.count,
        unitPrice: (commissionsByChannel.pr.total / commissionsByChannel.pr.count).toFixed(2),
        amount: commissionsByChannel.pr.total.toFixed(2),
      });
    }

    if (adjustmentTotal > 0) {
      invoiceItems.push({
        invoiceId: invoice.id,
        itemType: 'adjustment',
        description: 'Rettifiche',
        quantity: 1,
        unitPrice: adjustmentTotal.toFixed(2),
        amount: adjustmentTotal.toFixed(2),
      });
    }

    if (invoiceItems.length > 0) {
      await db.insert(organizerInvoiceItems).values(invoiceItems);
    }

    await WalletService.addLedgerEntry({
      companyId: params.companyId,
      walletId: wallet.id,
      type: 'invoice',
      direction: 'credit',
      amount: totalAmount,
      referenceType: 'invoice',
      referenceId: invoice.id,
      note: `Fattura ${invoiceNumber} emessa`,
    });

    return invoice;
  }

  static async markInvoicePaid(invoiceId: string): Promise<OrganizerInvoice> {
    const [invoice] = await db
      .select()
      .from(organizerInvoices)
      .where(eq(organizerInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice already paid');
    }

    const [updatedInvoice] = await db
      .update(organizerInvoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizerInvoices.id, invoiceId))
      .returning();

    const wallet = await WalletService.getOrCreateWallet(invoice.companyId);

    await WalletService.addLedgerEntry({
      companyId: invoice.companyId,
      walletId: wallet.id,
      type: 'payment',
      direction: 'credit',
      amount: parseFloat(invoice.amount),
      referenceType: 'invoice',
      referenceId: invoiceId,
      note: `Pagamento fattura ${invoice.invoiceNumber}`,
    });

    return updatedInvoice;
  }

  static async getInvoicesByCompany(companyId: string): Promise<OrganizerInvoice[]> {
    return db
      .select()
      .from(organizerInvoices)
      .where(eq(organizerInvoices.companyId, companyId))
      .orderBy(desc(organizerInvoices.createdAt));
  }

  static async getInvoiceById(invoiceId: string): Promise<OrganizerInvoice | null> {
    const [invoice] = await db
      .select()
      .from(organizerInvoices)
      .where(eq(organizerInvoices.id, invoiceId))
      .limit(1);
    return invoice || null;
  }
}

export class SubscriptionService {
  static async hasActiveSubscription(companyId: string): Promise<boolean> {
    const subscription = await this.getSubscription(companyId);
    
    if (!subscription) {
      return false;
    }

    if (subscription.status !== 'active') {
      return false;
    }

    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return false;
    }

    return true;
  }

  static async getSubscription(companyId: string): Promise<OrganizerSubscription | null> {
    const [subscription] = await db
      .select()
      .from(organizerSubscriptions)
      .where(eq(organizerSubscriptions.companyId, companyId))
      .orderBy(desc(organizerSubscriptions.createdAt))
      .limit(1);

    return subscription || null;
  }

  static async canCreateEvent(companyId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const subscription = await this.getSubscription(companyId);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'Nessun abbonamento attivo. Attiva un piano per creare eventi.',
      };
    }

    if (subscription.status !== 'active') {
      return {
        allowed: false,
        reason: `L'abbonamento è ${subscription.status === 'suspended' ? 'sospeso' : 'scaduto'}. Contatta il supporto.`,
      };
    }

    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return {
        allowed: false,
        reason: 'L\'abbonamento è scaduto. Rinnova il piano per creare eventi.',
      };
    }

    if (subscription.billingCycle === 'per_event') {
      const plan = await db.query.organizerPlans.findFirst({
        where: (plans, { eq }) => eq(plans.id, subscription.planId)
      });

      if (plan && plan.eventsIncluded) {
        const eventsRemaining = plan.eventsIncluded - (subscription.eventsUsed || 0);
        if (eventsRemaining <= 0) {
          return {
            allowed: false,
            reason: 'Hai esaurito gli eventi inclusi nel piano. Acquista ulteriori eventi o cambia piano.',
          };
        }
      }
    }

    return { allowed: true };
  }

  static async incrementEventsUsed(companyId: string): Promise<void> {
    const subscription = await this.getSubscription(companyId);
    
    if (subscription && subscription.billingCycle === 'per_event') {
      await db
        .update(organizerSubscriptions)
        .set({
          eventsUsed: (subscription.eventsUsed || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(organizerSubscriptions.id, subscription.id));
    }
  }

  static async getEventsRemaining(companyId: string): Promise<number | null> {
    const subscription = await this.getSubscription(companyId);
    
    if (!subscription || subscription.billingCycle !== 'per_event') {
      return null;
    }

    const plan = await db.query.organizerPlans.findFirst({
      where: (plans, { eq }) => eq(plans.id, subscription.planId)
    });

    if (!plan || !plan.eventsIncluded) {
      return null;
    }

    return plan.eventsIncluded - (subscription.eventsUsed || 0);
  }
}
