const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('siaeAPI', {
  // Bridge control
  startBridge: () => ipcRenderer.invoke('bridge:start'),
  stopBridge: () => ipcRenderer.invoke('bridge:stop'),
  getBridgeStatus: () => ipcRenderer.invoke('bridge:status'),
  
  // Reader and card operations
  checkReader: () => ipcRenderer.invoke('bridge:checkReader'),
  readCard: () => ipcRenderer.invoke('bridge:readCard'),
  
  // SIAE operations
  computeSigillo: (data) => ipcRenderer.invoke('bridge:computeSigillo', data),
  
  // Logging
  getLogPath: () => ipcRenderer.invoke('app:getLogPath'),
  getLogs: () => ipcRenderer.invoke('app:getLogs'),
  getFullLogs: () => ipcRenderer.invoke('app:getFullLogs'),
  
  // Live log updates
  onLogEntry: (callback) => {
    ipcRenderer.on('log:entry', (event, entry) => callback(entry));
  },
  
  // Platform info
  platform: process.platform,
  arch: process.arch
});
