import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { db } from './db';
import { companies, sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface BridgeConnection {
  ws: WebSocket;
  companyId: string;
  connectedAt: Date;
  lastPing: Date;
}

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  companyId: string;
  connectedAt: Date;
  lastPing: Date;
}

interface BridgeMessage {
  type: string;
  token?: string;
  companyId?: string;
  payload?: any;
  requestId?: string;
}

const activeBridges = new Map<string, BridgeConnection>();
const activeClients = new Map<string, ClientConnection[]>();

const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 35000;

export function setupBridgeRelay(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    if (url.pathname === '/ws/bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('[Bridge] New WebSocket connection');
    
    let connectionType: 'bridge' | 'client' | null = null;
    let connectionInfo: { userId?: string; companyId?: string } = {};

    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies['connect.sid'];

    if (sessionId) {
      const session = await getSessionData(sessionId);
      if (session?.passport?.user) {
        connectionType = 'client';
        connectionInfo = {
          userId: session.passport.user.id,
          companyId: session.passport.user.companyId,
        };
        console.log(`[Bridge] Client connected: userId=${connectionInfo.userId}, companyId=${connectionInfo.companyId}`);
        
        if (connectionInfo.companyId && connectionInfo.userId) {
          addClient(connectionInfo.companyId, connectionInfo.userId, ws);
          
          const bridgeConnected = activeBridges.has(connectionInfo.companyId);
          ws.send(JSON.stringify({
            type: 'connection_status',
            bridgeConnected,
            message: bridgeConnected ? 'Bridge desktop app is connected' : 'Bridge desktop app is not connected',
          }));
        }
      }
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message: BridgeMessage = JSON.parse(data.toString());
        console.log(`[Bridge] Message received: type=${message.type}`);

        if (message.type === 'bridge_register') {
          const result = await handleBridgeRegistration(ws, message);
          if (result.success) {
            connectionType = 'bridge';
            connectionInfo = { companyId: result.companyId };
            console.log(`[Bridge] Bridge registered for company: ${result.companyId}`);
            
            notifyClientsOfBridgeStatus(result.companyId!, true);
          }
          return;
        }

        if (message.type === 'pong') {
          if (connectionType === 'bridge' && connectionInfo.companyId) {
            const bridge = activeBridges.get(connectionInfo.companyId);
            if (bridge) {
              bridge.lastPing = new Date();
            }
          } else if (connectionType === 'client' && connectionInfo.companyId && connectionInfo.userId) {
            const clients = activeClients.get(connectionInfo.companyId);
            if (clients) {
              const client = clients.find(c => c.userId === connectionInfo.userId);
              if (client) {
                client.lastPing = new Date();
              }
            }
          }
          return;
        }

        if (connectionType === 'client' && connectionInfo.companyId) {
          forwardToBridge(connectionInfo.companyId, message, connectionInfo.userId);
        } else if (connectionType === 'bridge' && connectionInfo.companyId) {
          forwardToClients(connectionInfo.companyId, message);
        }

      } catch (error) {
        console.error('[Bridge] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }));
      }
    });

    ws.on('close', () => {
      console.log(`[Bridge] Connection closed: type=${connectionType}`);
      
      if (connectionType === 'bridge' && connectionInfo.companyId) {
        activeBridges.delete(connectionInfo.companyId);
        notifyClientsOfBridgeStatus(connectionInfo.companyId, false);
        console.log(`[Bridge] Bridge disconnected for company: ${connectionInfo.companyId}`);
      } else if (connectionType === 'client' && connectionInfo.companyId && connectionInfo.userId) {
        removeClient(connectionInfo.companyId, connectionInfo.userId);
        console.log(`[Bridge] Client disconnected: userId=${connectionInfo.userId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('[Bridge] WebSocket error:', error);
    });
  });

  setInterval(() => {
    const now = new Date();

    activeBridges.forEach((bridge, companyId) => {
      if (now.getTime() - bridge.lastPing.getTime() > CONNECTION_TIMEOUT) {
        console.log(`[Bridge] Bridge timeout for company: ${companyId}`);
        bridge.ws.terminate();
        activeBridges.delete(companyId);
        notifyClientsOfBridgeStatus(companyId, false);
      } else {
        bridge.ws.send(JSON.stringify({ type: 'ping' }));
      }
    });

    activeClients.forEach((clients, companyId) => {
      clients.forEach((client, index) => {
        if (now.getTime() - client.lastPing.getTime() > CONNECTION_TIMEOUT) {
          console.log(`[Bridge] Client timeout: userId=${client.userId}`);
          client.ws.terminate();
          clients.splice(index, 1);
        } else {
          client.ws.send(JSON.stringify({ type: 'ping' }));
        }
      });
      
      if (clients.length === 0) {
        activeClients.delete(companyId);
      }
    });
  }, HEARTBEAT_INTERVAL);

  console.log('[Bridge] WebSocket relay bridge initialized');
}

async function getSessionData(sessionId: string): Promise<any | null> {
  try {
    const cleanSessionId = sessionId.replace(/^s:/, '').split('.')[0];
    
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, cleanSessionId))
      .limit(1);

    if (result.length > 0 && result[0].sess) {
      return result[0].sess as any;
    }
    return null;
  } catch (error) {
    console.error('[Bridge] Error fetching session:', error);
    return null;
  }
}

async function handleBridgeRegistration(
  ws: WebSocket,
  message: BridgeMessage
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  const { token, companyId } = message;

  if (!token || !companyId) {
    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: false,
      error: 'Token and companyId are required',
    }));
    return { success: false, error: 'Token and companyId are required' };
  }

  try {
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      ws.send(JSON.stringify({
        type: 'bridge_register_response',
        success: false,
        error: 'Company not found',
      }));
      return { success: false, error: 'Company not found' };
    }

    if (company[0].bridgeToken !== token) {
      ws.send(JSON.stringify({
        type: 'bridge_register_response',
        success: false,
        error: 'Invalid token',
      }));
      return { success: false, error: 'Invalid token' };
    }

    const existingBridge = activeBridges.get(companyId);
    if (existingBridge) {
      console.log(`[Bridge] Replacing existing bridge for company: ${companyId}`);
      existingBridge.ws.terminate();
    }

    activeBridges.set(companyId, {
      ws,
      companyId,
      connectedAt: new Date(),
      lastPing: new Date(),
    });

    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: true,
      message: 'Bridge registered successfully',
    }));

    return { success: true, companyId };
  } catch (error) {
    console.error('[Bridge] Error during bridge registration:', error);
    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: false,
      error: 'Internal server error',
    }));
    return { success: false, error: 'Internal server error' };
  }
}

function addClient(companyId: string, userId: string, ws: WebSocket): void {
  if (!activeClients.has(companyId)) {
    activeClients.set(companyId, []);
  }
  
  const clients = activeClients.get(companyId)!;
  const existingIndex = clients.findIndex(c => c.userId === userId);
  
  if (existingIndex >= 0) {
    clients[existingIndex].ws.terminate();
    clients.splice(existingIndex, 1);
  }
  
  clients.push({
    ws,
    userId,
    companyId,
    connectedAt: new Date(),
    lastPing: new Date(),
  });
}

function removeClient(companyId: string, userId: string): void {
  const clients = activeClients.get(companyId);
  if (clients) {
    const index = clients.findIndex(c => c.userId === userId);
    if (index >= 0) {
      clients.splice(index, 1);
    }
    if (clients.length === 0) {
      activeClients.delete(companyId);
    }
  }
}

function notifyClientsOfBridgeStatus(companyId: string, connected: boolean): void {
  const clients = activeClients.get(companyId);
  if (clients) {
    const message = JSON.stringify({
      type: 'bridge_status',
      connected,
      message: connected ? 'Bridge desktop app connected' : 'Bridge desktop app disconnected',
    });
    
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}

function forwardToBridge(companyId: string, message: BridgeMessage, userId?: string): void {
  const bridge = activeBridges.get(companyId);
  if (bridge && bridge.ws.readyState === WebSocket.OPEN) {
    bridge.ws.send(JSON.stringify({
      ...message,
      fromUserId: userId,
    }));
  } else {
    console.log(`[Bridge] No active bridge for company: ${companyId}`);
  }
}

function forwardToClients(companyId: string, message: BridgeMessage): void {
  const clients = activeClients.get(companyId);
  if (clients) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
}

export function isBridgeConnected(companyId: string): boolean {
  const bridge = activeBridges.get(companyId);
  return bridge !== undefined && bridge.ws.readyState === WebSocket.OPEN;
}

export function getActiveBridgesCount(): number {
  return activeBridges.size;
}

export function getActiveClientsCount(): number {
  let count = 0;
  activeClients.forEach(clients => {
    count += clients.length;
  });
  return count;
}
