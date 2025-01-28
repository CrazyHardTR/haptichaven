const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Electron', {
    ipcRenderer: {
      invoke: ipcRenderer.invoke,
      send: ipcRenderer.send,
      on: ipcRenderer.on
    }
});