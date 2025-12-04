const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let tray;
let wss;
let pcsclite;
let readers = new Map();
let currentCard = null;
let connectedClients = new Set();

const WS_PORT = 18765;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 550,
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, 'icon.png'),
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
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Apri Event4U Smart Card', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Esci', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setToolTip('Event4U Smart Card Reader');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

function startWebSocketServer() {
  wss = new WebSocket.Server({ 
    port: WS_PORT,
    host: '127.0.0.1'
  });
  
  console.log(`WebSocket server running on 127.0.0.1:${WS_PORT}`);
  
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin || '';
    const isLocalhost = origin === '' || 
                        origin.includes('localhost') || 
                        origin.includes('127.0.0.1') ||
                        origin.includes('replit');
    
    if (!isLocalhost) {
      console.log('Rejected connection from:', origin);
      ws.close(1008, 'Origin not allowed');
      return;
    }
    
    console.log('Client connected from:', origin || 'local');
    ws.isAlive = true;
    connectedClients.add(ws);
    updateUI();
    
    ws.send(JSON.stringify({
      type: 'status',
      data: getStatus()
    }));
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        if (msg && typeof msg.type === 'string') {
          handleClientMessage(ws, msg);
        }
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
      connectedClients.delete(ws);
      updateUI();
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      connectedClients.delete(ws);
    });
  });
  
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        connectedClients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case 'get_status':
      ws.send(JSON.stringify({
        type: 'status',
        data: getStatus()
      }));
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function getStatus() {
  const readerList = Array.from(readers.keys());
  const hasReader = readerList.length > 0;
  const hasCard = currentCard !== null;
  
  return {
    connected: true,
    readerDetected: hasReader,
    cardInserted: hasCard,
    readerName: hasReader ? readerList[0] : null,
    cardAtr: hasCard ? currentCard.atr : null,
    cardType: hasCard ? detectCardType(currentCard.atr) : null,
    canEmitTickets: hasReader && hasCard,
    timestamp: new Date().toISOString()
  };
}

function detectCardType(atr) {
  if (!atr) return 'Sconosciuto';
  const atrHex = atr.toString('hex').toUpperCase();
  if (atrHex.includes('3B9F')) return 'SIAE Sigilli';
  if (atrHex.includes('3B8F')) return 'Smart Card Fiscale';
  return 'Smart Card';
}

function broadcastStatus() {
  const status = getStatus();
  const message = JSON.stringify({
    type: 'status',
    data: status
  });
  
  connectedClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  
  updateUI();
}

function updateUI() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      ...getStatus(),
      clientsConnected: connectedClients.size
    });
  }
}

function initializeSmartCardReader() {
  try {
    pcsclite = require('pcsclite')();
    console.log('PC/SC initialized');
    
    pcsclite.on('reader', (reader) => {
      console.log('Reader detected:', reader.name);
      readers.set(reader.name, reader);
      broadcastStatus();
      updateUI();
      
      reader.on('status', (status) => {
        const changes = reader.state ^ status.state;
        
        if (changes) {
          if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
            console.log('Card removed');
            currentCard = null;
            broadcastStatus();
          } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
            console.log('Card inserted');
            
            reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
              if (err) {
                console.error('Connect error:', err);
                return;
              }
              
              currentCard = {
                atr: status.atr,
                protocol: protocol,
                reader: reader.name
              };
              
              console.log('Card ATR:', status.atr.toString('hex'));
              broadcastStatus();
            });
          }
        }
      });
      
      reader.on('error', (err) => {
        console.error('Reader error:', err);
      });
      
      reader.on('end', () => {
        console.log('Reader removed:', reader.name);
        readers.delete(reader.name);
        if (currentCard && currentCard.reader === reader.name) {
          currentCard = null;
        }
        broadcastStatus();
      });
    });
    
    pcsclite.on('error', (err) => {
      console.error('PC/SC error:', err);
    });
    
  } catch (err) {
    console.error('Failed to initialize PC/SC:', err);
  }
}

ipcMain.handle('get-status', () => {
  return {
    ...getStatus(),
    clientsConnected: connectedClients.size,
    wsPort: WS_PORT
  };
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  startWebSocketServer();
  initializeSmartCardReader();
  
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
  app.isQuitting = true;
  if (wss) {
    wss.close();
  }
  if (pcsclite) {
    pcsclite.close();
  }
});
