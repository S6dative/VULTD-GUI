const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electron', {
  vusd:       (args)    => ipcRenderer.invoke('vusd', args),
  bitcoinCli: (args)    => ipcRenderer.invoke('bitcoin-cli', args),
  faucet:     (address) => ipcRenderer.invoke('faucet', address),
  btcBalance: ()        => ipcRenderer.invoke('btc-balance'),
  btcAddress: ()        => ipcRenderer.invoke('btc-address'),
})
