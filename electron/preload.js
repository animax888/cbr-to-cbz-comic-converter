const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectInputDir: () => ipcRenderer.invoke('select-input-dir'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  startConversion: (payload) => ipcRenderer.invoke('start-conversion', payload),
  onProgress: (handler) => {
    ipcRenderer.removeAllListeners('conversion-progress');
    ipcRenderer.on('conversion-progress', (_event, stats) => handler(stats));
  },
  onFailure: (handler) => {
    ipcRenderer.removeAllListeners('conversion-failed');
    ipcRenderer.on('conversion-failed', (_event, data) => handler(data));
  },
  openOutputDir: (dir) => ipcRenderer.invoke('open-output-dir', { dir })
});
