const { contextBridge, ipcRenderer, shell } = require("electron")
contextBridge.exposeInMainWorld("electron", {
  vusd:        (args)    => ipcRenderer.invoke("vusd", args),
  bitcoinCli:  (args)    => ipcRenderer.invoke("bitcoin-cli", args),
  faucet:      (address) => ipcRenderer.invoke("faucet", address),
  btcBalance:  ()        => ipcRenderer.invoke("btc-balance"),
  btcAddress:  ()        => ipcRenderer.invoke("btc-address"),
  readVaults:  ()        => ipcRenderer.invoke("read-vaults"),
  vusdBalance: ()        => ipcRenderer.invoke("vusd-balance-parsed"),
  vusdOracle:  ()        => ipcRenderer.invoke("vusd-oracle-parsed"),
  nodeInfo:    ()        => ipcRenderer.invoke("node-info"),
  shell: { openExternal: (url) => shell.openExternal(url) },
})
