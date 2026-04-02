const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: { invoke: (ch, ...a) => ipcRenderer.invoke(ch, ...a) }
})
