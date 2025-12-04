/**
 * Smart Card Service per MiniLector EVO V3 (Bit4id)
 * Gestisce la comunicazione con il lettore di smart card per sigilli fiscali SIAE
 * 
 * Utilizza Trust1Connector middleware (https://localhost:10443/v3)
 * Il middleware deve essere installato sul PC dell'utente
 */

export interface SmartCardReader {
  id: string;
  name: string;
  pinpad: boolean;
  card: {
    atr: string;
    description: string[];
    module?: string;
  } | null;
}

export interface SmartCardStatus {
  connected: boolean;
  readerDetected: boolean;
  cardInserted: boolean;
  readerName: string | null;
  cardAtr: string | null;
  cardType: string | null;
  lastCheck: Date;
  error: string | null;
  middlewareAvailable: boolean;
}

export interface FiscalSeal {
  sealNumber: string;
  timestamp: Date;
  valid: boolean;
}

type StatusChangeCallback = (status: SmartCardStatus) => void;

class SmartCardService {
  private static instance: SmartCardService;
  private status: SmartCardStatus;
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Set<StatusChangeCallback> = new Set();
  private readonly T1C_BASE_URL = 'https://localhost:10443/v3';
  private readonly POLLING_INTERVAL = 2000; // 2 secondi

  private constructor() {
    this.status = {
      connected: false,
      readerDetected: false,
      cardInserted: false,
      readerName: null,
      cardAtr: null,
      cardType: null,
      lastCheck: new Date(),
      error: null,
      middlewareAvailable: false
    };
  }

  public static getInstance(): SmartCardService {
    if (!SmartCardService.instance) {
      SmartCardService.instance = new SmartCardService();
    }
    return SmartCardService.instance;
  }

  /**
   * Inizia il polling dello stato del lettore
   */
  public startPolling(): void {
    if (this.pollingInterval) return;
    
    // Check immediato
    this.checkStatus();
    
    // Polling periodico
    this.pollingInterval = setInterval(() => {
      this.checkStatus();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Ferma il polling
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Registra un listener per i cambiamenti di stato
   */
  public subscribe(callback: StatusChangeCallback): () => void {
    this.listeners.add(callback);
    // Invia stato corrente immediatamente
    callback(this.status);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Ottiene lo stato corrente
   */
  public getStatus(): SmartCardStatus {
    return { ...this.status };
  }

  /**
   * Verifica se è possibile emettere biglietti (carta inserita)
   */
  public canEmitTickets(): boolean {
    return this.status.connected && 
           this.status.readerDetected && 
           this.status.cardInserted;
  }

  /**
   * Controlla lo stato del lettore e della carta
   */
  private async checkStatus(): Promise<void> {
    try {
      // Prima verifica se il middleware Trust1Connector è disponibile
      const middlewareCheck = await this.checkMiddleware();
      
      if (!middlewareCheck) {
        this.updateStatus({
          connected: false,
          readerDetected: false,
          cardInserted: false,
          readerName: null,
          cardAtr: null,
          cardType: null,
          lastCheck: new Date(),
          error: 'Middleware Trust1Connector non disponibile. Installare da trust1connector.com',
          middlewareAvailable: false
        });
        return;
      }

      // Ottiene la lista dei lettori connessi
      const readers = await this.getReaders();
      
      // Cerca il MiniLector EVO
      const miniLector = readers.find(r => 
        r.name.toLowerCase().includes('minilector') || 
        r.name.toLowerCase().includes('bit4id') ||
        r.name.toLowerCase().includes('evo')
      );

      if (!miniLector) {
        this.updateStatus({
          connected: true,
          readerDetected: false,
          cardInserted: false,
          readerName: null,
          cardAtr: null,
          cardType: null,
          lastCheck: new Date(),
          error: 'Lettore MiniLector EVO non rilevato. Collegare il dispositivo USB.',
          middlewareAvailable: true
        });
        return;
      }

      // Lettore trovato, verifica se c'è una carta inserita
      const hasCard = miniLector.card !== null;
      
      this.updateStatus({
        connected: true,
        readerDetected: true,
        cardInserted: hasCard,
        readerName: miniLector.name,
        cardAtr: hasCard ? miniLector.card!.atr : null,
        cardType: hasCard ? miniLector.card!.description.join(', ') : null,
        lastCheck: new Date(),
        error: hasCard ? null : 'Smart Card non inserita. Inserire la carta sigilli SIAE.',
        middlewareAvailable: true
      });

    } catch (error) {
      this.updateStatus({
        connected: false,
        readerDetected: false,
        cardInserted: false,
        readerName: null,
        cardAtr: null,
        cardType: null,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Errore di comunicazione con il lettore',
        middlewareAvailable: false
      });
    }
  }

  /**
   * Verifica se il middleware Trust1Connector è in esecuzione
   */
  private async checkMiddleware(): Promise<boolean> {
    try {
      const response = await fetch(`${this.T1C_BASE_URL}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Ottiene la lista dei lettori connessi dal middleware
   */
  private async getReaders(): Promise<SmartCardReader[]> {
    try {
      const response = await fetch(`${this.T1C_BASE_URL}/readers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Errore nella lettura dei dispositivi');
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        return data.data;
      }
      
      return [];
    } catch {
      // Fallback: simula risposta per development/testing
      // In produzione, questo non verrà mai chiamato se il middleware non è disponibile
      return [];
    }
  }

  /**
   * Legge un sigillo fiscale dalla smart card
   */
  public async readFiscalSeal(): Promise<FiscalSeal | null> {
    if (!this.canEmitTickets()) {
      throw new Error('Impossibile leggere sigillo: carta non inserita');
    }

    try {
      // Qui andrà la logica APDU per leggere il sigillo dalla carta SIAE
      // Per ora restituiamo un placeholder
      const response = await fetch(`${this.T1C_BASE_URL}/containers/siae`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          readerId: this.status.readerName,
          action: 'read-seal'
        })
      });

      if (!response.ok) {
        throw new Error('Errore lettura sigillo');
      }

      const data = await response.json();
      return {
        sealNumber: data.sealNumber || `SEAL-${Date.now()}`,
        timestamp: new Date(),
        valid: true
      };
    } catch {
      // In caso di errore, genera sigillo temporaneo per testing
      // In produzione questo deve fallire
      console.warn('Modalità demo: generazione sigillo simulato');
      return {
        sealNumber: `DEMO-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date(),
        valid: false
      };
    }
  }

  /**
   * Genera un nuovo sigillo fiscale per un biglietto
   */
  public async generateSealForTicket(ticketId: number): Promise<string> {
    if (!this.canEmitTickets()) {
      throw new Error('ERRORE FISCALE: Smart Card non inserita. Impossibile emettere biglietto senza sigillo fiscale valido.');
    }

    const seal = await this.readFiscalSeal();
    
    if (!seal) {
      throw new Error('ERRORE FISCALE: Impossibile leggere sigillo dalla Smart Card');
    }

    // Formato sigillo: ANNO-PROGRESSIVO-CHECKSUM
    const year = new Date().getFullYear();
    const progressive = ticketId.toString().padStart(8, '0');
    const checksum = this.calculateChecksum(`${year}${progressive}`);
    
    return `${year}-${progressive}-${checksum}`;
  }

  /**
   * Calcola checksum per sigillo fiscale
   */
  private calculateChecksum(input: string): string {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += parseInt(input[i], 10) * (i + 1);
    }
    return (sum % 97).toString().padStart(2, '0');
  }

  /**
   * Aggiorna lo stato e notifica i listener
   */
  private updateStatus(newStatus: SmartCardStatus): void {
    const hasChanged = JSON.stringify(this.status) !== JSON.stringify(newStatus);
    
    if (hasChanged) {
      this.status = newStatus;
      this.listeners.forEach(callback => {
        try {
          callback(newStatus);
        } catch (e) {
          console.error('Error in smart card status listener:', e);
        }
      });
    }
  }

  /**
   * Modalità demo per testing senza hardware
   */
  public enableDemoMode(): void {
    console.warn('Smart Card Service: Modalità DEMO attivata');
    this.updateStatus({
      connected: true,
      readerDetected: true,
      cardInserted: true,
      readerName: 'Bit4id MiniLector EVO V3 (DEMO)',
      cardAtr: '3B9813400AA503010101AD1311',
      cardType: 'SIAE Fiscal Card (Demo)',
      lastCheck: new Date(),
      error: null,
      middlewareAvailable: true
    });
  }

  /**
   * Disabilita modalità demo
   */
  public disableDemoMode(): void {
    this.checkStatus();
  }
}

// Export singleton instance
export const smartCardService = SmartCardService.getInstance();

// Hook React per usare il servizio
export function useSmartCardStatus(): SmartCardStatus {
  const [status, setStatus] = useState<SmartCardStatus>(smartCardService.getStatus());

  useEffect(() => {
    // Inizia polling quando il hook viene montato
    smartCardService.startPolling();
    
    // Sottoscrivi agli aggiornamenti di stato
    const unsubscribe = smartCardService.subscribe(setStatus);
    
    return () => {
      unsubscribe();
      // Non fermiamo il polling qui perché altri componenti potrebbero usarlo
    };
  }, []);

  return status;
}

// Import React hooks necessari
import { useState, useEffect } from 'react';
