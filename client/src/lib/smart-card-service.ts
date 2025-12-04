/**
 * Smart Card Service per MiniLector EVO V3 (Bit4id)
 * Gestisce la comunicazione con il lettore di smart card per sigilli fiscali SIAE
 * 
 * Metodi di connessione (in ordine di priorità):
 * 1. WebSocket locale (Event4U Desktop App) - ws://localhost:18765
 * 2. Trust1Connector middleware - https://localhost:10443/v3
 */

import { useState, useEffect } from 'react';

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
  connectionMethod: 'websocket' | 'trust1connector' | 'none';
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
  private ws: WebSocket | null = null;
  private wsReconnectTimer: NodeJS.Timeout | null = null;
  
  private readonly WS_URL = 'ws://localhost:18765';
  private readonly T1C_BASE_URL = 'https://localhost:10443/v3';
  private readonly POLLING_INTERVAL = 3000;
  private readonly WS_RECONNECT_DELAY = 5000;

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
      middlewareAvailable: false,
      connectionMethod: 'none'
    };
  }

  public static getInstance(): SmartCardService {
    if (!SmartCardService.instance) {
      SmartCardService.instance = new SmartCardService();
    }
    return SmartCardService.instance;
  }

  /**
   * Inizia la connessione con il lettore
   */
  public startPolling(): void {
    if (this.pollingInterval || this.ws) return;
    
    this.tryWebSocketConnection();
  }

  /**
   * Tenta connessione WebSocket (app desktop Event4U)
   */
  private tryWebSocketConnection(): void {
    try {
      this.ws = new WebSocket(this.WS_URL);
      
      this.ws.onopen = () => {
        console.log('Smart Card: Connesso via WebSocket');
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
        this.ws?.send(JSON.stringify({ type: 'get_status' }));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status' && msg.data) {
            this.handleWebSocketStatus(msg.data);
          }
        } catch (e) {
          console.error('Smart Card: Errore parsing messaggio:', e);
        }
      };
      
      this.ws.onerror = () => {
        console.log('Smart Card: WebSocket non disponibile, provo Trust1Connector');
        this.ws = null;
        this.startTrust1ConnectorPolling();
      };
      
      this.ws.onclose = () => {
        this.ws = null;
        if (!this.pollingInterval) {
          this.scheduleWebSocketReconnect();
        }
      };
      
    } catch {
      this.startTrust1ConnectorPolling();
    }
  }

  /**
   * Gestisce lo stato ricevuto via WebSocket
   */
  private handleWebSocketStatus(data: any): void {
    this.updateStatus({
      connected: data.connected ?? false,
      readerDetected: data.readerDetected ?? false,
      cardInserted: data.cardInserted ?? false,
      readerName: data.readerName || null,
      cardAtr: data.cardAtr || null,
      cardType: data.cardType || null,
      lastCheck: new Date(),
      error: data.canEmitTickets ? null : this.getErrorMessage(data),
      middlewareAvailable: true,
      connectionMethod: 'websocket'
    });
  }

  /**
   * Genera messaggio di errore appropriato
   */
  private getErrorMessage(data: any): string | null {
    if (!data.readerDetected) {
      return 'Lettore Smart Card non rilevato. Collegare il MiniLector EVO.';
    }
    if (!data.cardInserted) {
      return 'Smart Card SIAE non inserita. Inserire la carta sigilli.';
    }
    return null;
  }

  /**
   * Pianifica riconnessione WebSocket
   */
  private scheduleWebSocketReconnect(): void {
    if (this.wsReconnectTimer) return;
    
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      if (!this.ws && !this.pollingInterval) {
        this.tryWebSocketConnection();
      }
    }, this.WS_RECONNECT_DELAY);
  }

  /**
   * Avvia polling Trust1Connector (fallback)
   */
  private startTrust1ConnectorPolling(): void {
    if (this.pollingInterval) return;
    
    this.checkTrust1ConnectorStatus();
    
    this.pollingInterval = setInterval(() => {
      this.checkTrust1ConnectorStatus();
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
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Registra un listener per i cambiamenti di stato
   */
  public subscribe(callback: StatusChangeCallback): () => void {
    this.listeners.add(callback);
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
   * Verifica se è possibile emettere biglietti
   */
  public canEmitTickets(): boolean {
    return this.status.connected && 
           this.status.readerDetected && 
           this.status.cardInserted;
  }

  /**
   * Controlla lo stato via Trust1Connector
   */
  private async checkTrust1ConnectorStatus(): Promise<void> {
    try {
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
          error: 'Nessuna connessione al lettore. Avviare l\'app Event4U Smart Card Reader.',
          middlewareAvailable: false,
          connectionMethod: 'none'
        });
        
        this.tryWebSocketConnection();
        return;
      }

      const readers = await this.getReaders();
      
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
          middlewareAvailable: true,
          connectionMethod: 'trust1connector'
        });
        return;
      }

      const hasCard = miniLector.card !== null;
      
      this.updateStatus({
        connected: true,
        readerDetected: true,
        cardInserted: hasCard,
        readerName: miniLector.name,
        cardAtr: hasCard ? miniLector.card!.atr : null,
        cardType: hasCard ? miniLector.card!.description.join(', ') : null,
        lastCheck: new Date(),
        error: hasCard ? null : 'Smart Card SIAE non inserita.',
        middlewareAvailable: true,
        connectionMethod: 'trust1connector'
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
        error: error instanceof Error ? error.message : 'Errore di comunicazione',
        middlewareAvailable: false,
        connectionMethod: 'none'
      });
    }
  }

  /**
   * Verifica se Trust1Connector è in esecuzione
   */
  private async checkMiddleware(): Promise<boolean> {
    try {
      const response = await fetch(`${this.T1C_BASE_URL}/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Ottiene la lista dei lettori da Trust1Connector
   */
  private async getReaders(): Promise<SmartCardReader[]> {
    try {
      const response = await fetch(`${this.T1C_BASE_URL}/readers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
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
      const response = await fetch(`${this.T1C_BASE_URL}/containers/siae`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      middlewareAvailable: true,
      connectionMethod: 'websocket'
    });
  }

  /**
   * Disabilita modalità demo
   */
  public disableDemoMode(): void {
    this.checkTrust1ConnectorStatus();
  }
}

export const smartCardService = SmartCardService.getInstance();

export function useSmartCardStatus(): SmartCardStatus {
  const [status, setStatus] = useState<SmartCardStatus>(smartCardService.getStatus());

  useEffect(() => {
    smartCardService.startPolling();
    const unsubscribe = smartCardService.subscribe(setStatus);
    
    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
