const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  enableDemo: () => ipcRenderer.invoke('enable-demo'),
  disableDemo: () => ipcRenderer.invoke('disable-demo'),
  refreshStatus: () => ipcRenderer.invoke('refresh-status'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  }
});
