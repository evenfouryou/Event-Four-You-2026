/**
 * Event Four You SIAE Lettore - Applicazione Electron
 * Lettore Smart Card SIAE per MiniLector EVO V3
 * Integra il bridge .NET per comunicare con libSIAE.dll
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

// ==================== SISTEMA DI LOGGING ====================
const LOG_FILE = path.join(app.getPath('userData'), 'event4u-siae.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
  
  console.log(logLine.trim());
  
  try {
    // Rotazione log se troppo grande
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const backupFile = LOG_FILE + '.old';
        if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
        fs.renameSync(LOG_FILE, backupFile);
      }
    }
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    console.error('Errore scrittura log:', err.message);
  }
}

function logInfo(message, data) { log('INFO', message, data); }
function logError(message, data) { log('ERROR', message, data); }
function logWarn(message, data) { log('WARN', message, data); }
function logDebug(message, data) { log('DEBUG', message, data); }

// ==================== CONFIGURAZIONE ====================
const PORT = 18765;
const BRIDGE_PORT = 18766;
const BRIDGE_RETRY_DELAY = 3000;
const BRIDGE_MAX_RETRIES = 10;

// ==================== STATO GLOBALE ====================
let mainWindow = null;
let tray = null;
let httpServer = null;
let wss = null;
let bridgeProcess = null;
let bridgeWs = null;
let bridgeRetryCount = 0;
let bridgeRetryTimer = null;

let systemState = {
  readerConnected: false,
  cardInserted: false,
  cardATR: null,
  cardSerial: null,
  readerName: null,
  lastError: null,
  simulationMode: false,
  clientsConnected: 0,
  bridgeConnected: false,
  bridgeInitialized: false,
  canEmitRealSeals: false
};

const wsClients = new Set();

// Origini permesse
const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://localhost:5000',
  'https://127.0.0.1:5000'
];
const REPLIT_PATTERN = /^https?:\/\/.*\.replit\.(dev|app|co)$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (REPLIT_PATTERN.test(origin)) return true;
  return false;
}

// ==================== BRIDGE .NET ====================
function findBridgePath() {
  const possiblePaths = [
    // Packaged app paths
    path.join(process.resourcesPath || '', 'SiaeBridge', 'EventFourYouSiaeLettore.exe'),
    path.join(process.resourcesPath || '', 'SiaeBridge', 'net472', 'EventFourYouSiaeLettore.exe'),
    // Development paths
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'net472', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'net472', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'EventFourYouSiaeLettore.exe')
  ];
  
  logDebug('Cercando bridge in:', possiblePaths);
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      logInfo('Bridge trovato:', p);
      return p;
    }
  }
  
  logError('Bridge NON trovato in nessun percorso');
  return null;
}

function startBridge() {
  const bridgePath = findBridgePath();
  
  if (!bridgePath) {
    systemState.lastError = 'Bridge .NET non trovato';
    systemState.bridgeConnected = false;
    logError('Impossibile avviare bridge: file non trovato');
    updateUI();
    broadcastStatus();
    return;
  }
  
  logInfo('Avvio bridge .NET:', bridgePath);
  
  try {
    const bridgeDir = path.dirname(bridgePath);
    logDebug('Directory bridge:', bridgeDir);
    
    // Verifica libSIAE.dll
    const libSiaePath = path.join(bridgeDir, 'libSIAE.dll');
    if (fs.existsSync(libSiaePath)) {
      logInfo('libSIAE.dll trovata:', libSiaePath);
    } else {
      logWarn('libSIAE.dll NON trovata in:', bridgeDir);
    }
    
    bridgeProcess = spawn(bridgePath, [], {
      cwd: bridgeDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true
    });
    
    logInfo('Bridge avviato con PID:', bridgeProcess.pid);
    
    bridgeProcess.stdout.on('data', (data) => {
      logDebug('Bridge stdout:', data.toString().trim());
    });
    
    bridgeProcess.stderr.on('data', (data) => {
      logError('Bridge stderr:', data.toString().trim());
    });
    
    bridgeProcess.on('error', (err) => {
      logError('Errore avvio bridge:', err.message);
      systemState.bridgeConnected = false;
      systemState.lastError = 'Errore avvio bridge: ' + err.message;
      updateUI();
      broadcastStatus();
    });
    
    bridgeProcess.on('exit', (code, signal) => {
      logWarn('Bridge terminato:', { code, signal });
      systemState.bridgeConnected = false;
      bridgeProcess = null;
      updateUI();
      broadcastStatus();
    });
    
    // Attendi un po' prima di connettersi
    setTimeout(() => {
      connectToBridge();
    }, 2000);
    
  } catch (err) {
    logError('Errore spawn bridge:', err.message);
    systemState.lastError = 'Errore spawn bridge: ' + err.message;
  }
}

function connectToBridge() {
  if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    logDebug('Bridge già connesso');
    return;
  }
  
  const wsUrl = `ws://127.0.0.1:${BRIDGE_PORT}`;
  logInfo('Connessione al bridge:', wsUrl);
  
  try {
    bridgeWs = new WebSocket(wsUrl);
    
    bridgeWs.on('open', () => {
      logInfo('CONNESSO al bridge .NET');
      bridgeRetryCount = 0;
      systemState.bridgeConnected = true;
      systemState.lastError = null;
      
      // Richiedi stato iniziale
      bridgeWs.send(JSON.stringify({ type: 'get_status' }));
      
      updateUI();
      broadcastStatus();
    });
    
    bridgeWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        logDebug('Messaggio dal bridge:', msg);
        handleBridgeMessage(msg);
      } catch (err) {
        logError('Errore parsing messaggio bridge:', err.message);
      }
    });
    
    bridgeWs.on('close', (code, reason) => {
      logWarn('Disconnesso dal bridge:', { code, reason: reason.toString() });
      systemState.bridgeConnected = false;
      bridgeWs = null;
      updateUI();
      broadcastStatus();
      scheduleBridgeReconnect();
    });
    
    bridgeWs.on('error', (err) => {
      logError('Errore WebSocket bridge:', err.message);
      systemState.bridgeConnected = false;
      systemState.lastError = 'Errore connessione bridge: ' + err.message;
      updateUI();
      broadcastStatus();
    });
    
  } catch (err) {
    logError('Errore creazione WebSocket:', err.message);
    scheduleBridgeReconnect();
  }
}

function scheduleBridgeReconnect() {
  if (bridgeRetryTimer) {
    clearTimeout(bridgeRetryTimer);
  }
  
  bridgeRetryCount++;
  
  if (bridgeRetryCount > BRIDGE_MAX_RETRIES) {
    logError('Troppi tentativi di riconnessione al bridge, riavvio bridge...');
    bridgeRetryCount = 0;
    
    // Riavvia il bridge
    if (bridgeProcess) {
      try {
        bridgeProcess.kill();
      } catch {}
    }
    
    setTimeout(() => {
      startBridge();
    }, 2000);
    return;
  }
  
  const delay = BRIDGE_RETRY_DELAY * Math.min(bridgeRetryCount, 3);
  logInfo(`Riconnessione bridge in ${delay}ms (tentativo ${bridgeRetryCount}/${BRIDGE_MAX_RETRIES})`);
  
  bridgeRetryTimer = setTimeout(() => {
    connectToBridge();
  }, delay);
}

function handleBridgeMessage(msg) {
  if (msg.type === 'status' && msg.data) {
    const data = msg.data;
    
    logDebug('Stato ricevuto dal bridge:', data);
    
    // Aggiorna stato dal bridge (fonte autoritativa)
    systemState.bridgeConnected = true;
    systemState.bridgeInitialized = data.initialized || false;
    systemState.readerConnected = data.readerConnected || data.readerDetected || data.initialized || false;
    systemState.readerName = data.readerName || null;
    systemState.cardInserted = data.cardInserted || false;
    systemState.cardSerial = data.cardSerial || null;
    systemState.simulationMode = data.demoMode || data.simulationMode || false;
    systemState.canEmitRealSeals = data.canEmitTickets || false;
    systemState.lastError = data.lastError || null;
    
    if (data.cardInserted) {
      logInfo('CARTA RILEVATA:', { serial: data.cardSerial, reader: data.readerName });
    }
    
    updateUI();
    broadcastStatus();
    updateTrayTooltip();
  } else if (msg.type === 'sealResponse') {
    logInfo('Risposta sigillo:', msg);
  } else if (msg.type === 'error') {
    logError('Errore dal bridge:', msg.message);
    systemState.lastError = msg.message;
  }
}

function sendToBridge(command) {
  return new Promise((resolve, reject) => {
    if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
      reject(new Error('Bridge non connesso'));
      return;
    }
    
    logDebug('Invio comando al bridge:', command);
    
    const timeout = setTimeout(() => {
      reject(new Error('Timeout risposta bridge'));
    }, 10000);
    
    const handler = (data) => {
      clearTimeout(timeout);
      bridgeWs.removeListener('message', handler);
      try {
        const response = JSON.parse(data.toString());
        logDebug('Risposta bridge:', response);
        resolve(response);
      } catch (err) {
        reject(err);
      }
    };
    
    bridgeWs.on('message', handler);
    bridgeWs.send(JSON.stringify(command));
  });
}

// ==================== BROADCAST STATUS ====================
function getStatusForBroadcast() {
  return {
    connected: true,
    readerDetected: systemState.readerConnected,
    readerConnected: systemState.readerConnected,
    cardInserted: systemState.cardInserted,
    readerName: systemState.readerName,
    cardAtr: systemState.cardATR,
    cardATR: systemState.cardATR,
    cardSerial: systemState.cardSerial,
    cardType: systemState.cardInserted ? 'Smart Card SIAE' : null,
    canEmitTickets: systemState.readerConnected && systemState.cardInserted,
    canEmitRealSeals: systemState.canEmitRealSeals,
    bridgeConnected: systemState.bridgeConnected,
    bridgeInitialized: systemState.bridgeInitialized,
    initialized: systemState.bridgeInitialized,
    middlewareAvailable: true,
    simulationMode: systemState.simulationMode,
    demoMode: systemState.simulationMode,
    lastError: systemState.lastError,
    timestamp: new Date().toISOString()
  };
}

function broadcastStatus() {
  systemState.clientsConnected = wsClients.size;
  
  const message = JSON.stringify({
    type: 'status',
    data: getStatusForBroadcast()
  });
  
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function updateUI() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      ...getStatusForBroadcast(),
      clientsConnected: wsClients.size,
      wsPort: PORT,
      logFile: LOG_FILE
    });
  }
}

function updateTrayTooltip() {
  if (!tray) return;
  
  let tooltip = 'Event4U Smart Card Reader\n';
  if (systemState.simulationMode) {
    tooltip += 'MODALITA DEMO\n';
  }
  if (!systemState.bridgeConnected) {
    tooltip += 'Bridge: Non connesso\n';
  } else if (systemState.readerConnected) {
    tooltip += `Lettore: ${systemState.readerName || 'Connesso'}\n`;
    tooltip += systemState.cardInserted ? `Carta: ${systemState.cardSerial || 'Inserita'}` : 'Carta: Non inserita';
  } else {
    tooltip += 'Lettore: Non rilevato';
  }
  
  tray.setToolTip(tooltip);
}

// ==================== GENERAZIONE SIGILLI ====================
async function generateFiscalSeal(data) {
  const timestamp = new Date().toISOString();
  
  if (systemState.bridgeConnected) {
    try {
      const response = await sendToBridge({
        type: 'computeSigillo',
        data: {
          ticketData: JSON.stringify({
            eventId: data?.eventId,
            ticketId: data?.ticketId,
            timestamp: timestamp
          })
        }
      });
      
      if (response.success && response.seal) {
        logInfo('Sigillo generato:', response.seal);
        return {
          sealNumber: response.seal.sealCode,
          timestamp: response.seal.timestamp || timestamp,
          eventId: data?.eventId,
          ticketId: data?.ticketId,
          signature: response.seal.sealCode,
          cardSerial: response.seal.cardSerial || systemState.cardSerial,
          cardATR: systemState.cardATR,
          simulationMode: false,
          realSeal: true
        };
      }
    } catch (err) {
      logError('Errore generazione sigillo:', err.message);
    }
  }
  
  // Fallback demo
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  logWarn('Generato sigillo DEMO');
  return {
    sealNumber: `DEMO-${Date.now()}-${random}`,
    timestamp: timestamp,
    eventId: data?.eventId,
    ticketId: data?.ticketId,
    signature: 'DEMO_SIGNATURE_' + random,
    cardATR: systemState.cardATR,
    simulationMode: true,
    realSeal: false
  };
}

// ==================== SERVER WEBSOCKET ====================
function createServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        version: '1.0.0',
        logFile: LOG_FILE,
        ...getStatusForBroadcast()
      }));
    } else if (req.url === '/logs') {
      // Endpoint per leggere i log
      try {
        const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : 'Nessun log';
        res.end(JSON.stringify({ logs: logs.split('\n').slice(-100) }));
      } catch (err) {
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  wss = new WebSocket.Server({ server: httpServer });
  
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    
    if (!isAllowedOrigin(origin)) {
      logWarn('Connessione rifiutata:', origin);
      ws.close(4003, 'Origin not allowed');
      return;
    }
    
    logInfo('Client connesso:', origin || 'locale');
    wsClients.add(ws);
    updateUI();
    
    ws.send(JSON.stringify({
      type: 'status',
      data: getStatusForBroadcast()
    }));
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        logDebug('Messaggio da client:', msg.type);
        
        switch (msg.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'getStatus':
          case 'get_status':
            ws.send(JSON.stringify({ type: 'status', data: getStatusForBroadcast() }));
            break;
            
          case 'requestSeal':
          case 'computeSigillo':
            if (!systemState.cardInserted && !systemState.simulationMode) {
              ws.send(JSON.stringify({
                type: 'sealResponse',
                success: false,
                error: 'Smart card non inserita'
              }));
            } else {
              generateFiscalSeal(msg.data).then(seal => {
                ws.send(JSON.stringify({
                  type: 'sealResponse',
                  success: true,
                  seal: seal
                }));
              }).catch(err => {
                ws.send(JSON.stringify({
                  type: 'sealResponse',
                  success: false,
                  error: err.message
                }));
              });
            }
            break;
            
          case 'enableDemo':
            enableDemoMode();
            break;
            
          case 'disableDemo':
            disableDemoMode();
            break;
            
          case 'getLogs':
            try {
              const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
              ws.send(JSON.stringify({ 
                type: 'logsResponse', 
                logs: logs.split('\n').slice(-200) 
              }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'logsResponse', error: err.message }));
            }
            break;
        }
      } catch (err) {
        logError('Errore parsing messaggio client:', err.message);
      }
    });
    
    ws.on('close', () => {
      logInfo('Client disconnesso');
      wsClients.delete(ws);
      updateUI();
    });
    
    ws.on('error', () => {
      wsClients.delete(ws);
      updateUI();
    });
  });
  
  httpServer.listen(PORT, '127.0.0.1', () => {
    logInfo(`Server WebSocket avviato su ws://127.0.0.1:${PORT}`);
  });
}

// ==================== DEMO MODE ====================
function enableDemoMode() {
  logInfo('Attivazione modalita DEMO');
  
  if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    bridgeWs.send(JSON.stringify({ type: 'enableDemo' }));
  }
  
  systemState.simulationMode = true;
  systemState.readerConnected = true;
  systemState.readerName = 'MiniLector EVO V3 (DEMO)';
  systemState.cardInserted = true;
  systemState.cardATR = 'DEMO_MODE_ATR';
  systemState.cardSerial = 'DEMO-12345678';
  systemState.lastError = null;
  
  updateUI();
  broadcastStatus();
  updateTrayTooltip();
}

function disableDemoMode() {
  logInfo('Disattivazione modalita DEMO');
  
  if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    bridgeWs.send(JSON.stringify({ type: 'disableDemo' }));
  }
  
  systemState.simulationMode = false;
  systemState.readerConnected = false;
  systemState.cardInserted = false;
  systemState.cardSerial = null;
  systemState.cardATR = null;
  
  updateUI();
  broadcastStatus();
  updateTrayTooltip();
}

// ==================== FINESTRA E TRAY ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    resizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  logInfo('Finestra principale creata');
}

function createTray() {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 66;
    canvas[i * 4 + 1] = 133;
    canvas[i * 4 + 2] = 244;
    canvas[i * 4 + 3] = 255;
  }
  
  const icon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Apri Event4U Smart Card Reader', 
      click: () => mainWindow.show()
    },
    { type: 'separator' },
    {
      label: 'Attiva Modalita Demo',
      click: () => enableDemoMode()
    },
    {
      label: 'Disattiva Modalita Demo',
      click: () => disableDemoMode()
    },
    { type: 'separator' },
    {
      label: 'Apri File Log',
      click: () => shell.openPath(LOG_FILE)
    },
    {
      label: 'Apri Cartella Log',
      click: () => shell.openPath(path.dirname(LOG_FILE))
    },
    { type: 'separator' },
    { 
      label: 'Esci', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Event4U Smart Card Reader');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => mainWindow.show());
  
  logInfo('Tray icon creata');
}

// ==================== IPC HANDLERS ====================
ipcMain.handle('get-status', () => {
  return {
    ...getStatusForBroadcast(),
    clientsConnected: wsClients.size,
    wsPort: PORT,
    logFile: LOG_FILE
  };
});

ipcMain.handle('enable-demo', () => {
  enableDemoMode();
  return getStatusForBroadcast();
});

ipcMain.handle('disable-demo', () => {
  disableDemoMode();
  return getStatusForBroadcast();
});

ipcMain.handle('refresh-status', async () => {
  if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    bridgeWs.send(JSON.stringify({ type: 'get_status' }));
  }
  return getStatusForBroadcast();
});

ipcMain.handle('get-logs', () => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      return content.split('\n').slice(-200);
    }
  } catch {}
  return [];
});

ipcMain.handle('open-log-file', () => {
  shell.openPath(LOG_FILE);
});

// ==================== APP LIFECYCLE ====================
app.whenReady().then(() => {
  logInfo('='.repeat(60));
  logInfo('Event4U SIAE Lettore avviato');
  logInfo('Versione Electron:', process.versions.electron);
  logInfo('Piattaforma:', process.platform);
  logInfo('Architettura:', process.arch);
  logInfo('User Data:', app.getPath('userData'));
  logInfo('Log file:', LOG_FILE);
  logInfo('='.repeat(60));
  
  createWindow();
  createTray();
  createServer();
  
  // Avvia bridge .NET
  startBridge();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logInfo('Chiusura applicazione...');
  app.isQuitting = true;
  
  if (bridgeRetryTimer) {
    clearTimeout(bridgeRetryTimer);
  }
  if (bridgeWs) {
    bridgeWs.close();
  }
  if (bridgeProcess) {
    try {
      bridgeProcess.kill();
      logInfo('Bridge terminato');
    } catch (err) {
      logError('Errore chiusura bridge:', err.message);
    }
  }
  if (wss) {
    wss.close();
  }
  if (httpServer) {
    httpServer.close();
  }
  
  logInfo('Applicazione chiusa');
});
