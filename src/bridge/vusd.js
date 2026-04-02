async function runVusd(args) {
  if (window.electron?.ipcRenderer) {
    return window.electron.ipcRenderer.invoke('vusd', args)
  }
  return mockResponse(args)
}

function mockResponse(args) {
  const cmd = args[0]
  if (cmd === 'balance') return { balance: 15.00, outputs: 3, btc_price: 66827 }
  if (cmd === 'oracle') return { price: 66827, valid_sigs: 7 }
  if (cmd === 'generate-address') return { address: 'vusd:620feb5d...:ba53841e...' }
  return {}
}

export const vusd = {
  balance: () => runVusd(['balance']),
  oracle: () => runVusd(['oracle']),
  send: (to, amount) => runVusd(['send', '--to', to, '--amount', String(amount)]),
  receive: () => runVusd(['receive']),
  openVault: (sats) => runVusd(['open-vault', '--collateral', String(sats)]),
  mint: (vault, amount) => runVusd(['mint', '--vault', vault, '--amount', String(amount)]),
  repay: (vault, amount) => runVusd(['repay', '--vault', vault, '--amount', String(amount)]),
  closeVault: (vault) => runVusd(['close', '--vault', vault]),
  health: (vault) => runVusd(['health', '--vault', vault]),
  generateAddress: () => runVusd(['generate-address']),
}
