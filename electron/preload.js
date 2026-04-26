const { contextBridge, ipcRenderer, shell } = require("electron")

contextBridge.exposeInMainWorld("electron", {
  // vusd CLI passthrough
  vusd:             (args)    => ipcRenderer.invoke("vusd", args),

  // Bitcoin Core RPC helpers
  bitcoinCli:       (args)    => ipcRenderer.invoke("bitcoin-cli", args),
  btcBalance:       ()        => ipcRenderer.invoke("btc-balance"),
  btcAddress:       ()        => ipcRenderer.invoke("btc-address"),
  btcNewAddress:    ()        => ipcRenderer.invoke("btc-new-address"),

  // File / state readers
  readVaults:       ()        => ipcRenderer.invoke("read-vaults"),
  readVaultsRaw:    ()        => ipcRenderer.invoke("read-vaults-raw"),
  readFile:         (path)    => ipcRenderer.invoke("read-file", path),
  readWallet:       ()        => ipcRenderer.invoke("read-wallet"),

  // Parsed CLI outputs
  vusdBalance:      ()        => ipcRenderer.invoke("vusd-balance-parsed"),
  vusdOracle:       ()        => ipcRenderer.invoke("vusd-oracle-parsed"),

  // Node / network status
  nodeInfo:         ()        => ipcRenderer.invoke("node-info"),
  networkStatus:    ()        => ipcRenderer.invoke("network-status"),

  // Transactions + faucet
  listTransactions: ()        => ipcRenderer.invoke("list-transactions"),
  faucet:           (address) => ipcRenderer.invoke("faucet", address),

  // Network switch
  setNetwork:       (network) => ipcRenderer.invoke("set-network", network),

  // Shell utilities
  shell: { openExternal: (url) => shell.openExternal(url) },
})
