const isElectron = !!window.electron

function mock(channel, args) {
  if (channel === 'btcBalance') return Promise.resolve(0)
  if (channel === 'vusdBalance') return Promise.resolve({ balance: 0 })
  if (channel === 'readVaults') return Promise.resolve([])
  if (channel === 'readVaultsRaw') return Promise.resolve('{}')
  if (channel === 'vusd') {
    const cmd = args?.[0]
    if (cmd === 'balance') return Promise.resolve({ balance: 0, outputs: 0 })
    if (cmd === 'generate-address') return Promise.resolve({ address: '' })
    if (cmd === 'oracle') return Promise.resolve({ price: 85000, valid_sigs: 7 })
  }
  return Promise.resolve({})
}

async function ipc(channel, ...args) {
  if (!isElectron) return mock(channel, args[0])
  try { return await window.electron[channel]?.(...args) }
  catch (e) { console.error('IPC', channel, e); throw e }
}

export const bridge = {
  btcBalance:      ()              => ipc('btcBalance'),
  btcAddress:      ()              => ipc('btcAddress'),
  btcNewAddress:   ()              => ipc('btcNewAddress'),
  vusdBalance:     ()              => ipc('vusdBalance'),
  readVaults:      ()              => ipc('readVaults'),
  readVaultsRaw:   ()              => ipc('readVaultsRaw'),
  readWallet:      ()              => ipc('readWallet'),
  faucet:          (addr)          => ipc('faucet', addr),
  oracle:          ()              => ipc('vusd', ['oracle']),
  generateAddress: ()              => ipc('vusd', ['generate-address']),
  openVault:       (sats)          => ipc('vusd', ['open-vault', '--collateral', String(sats)]),
  mint:            (vault, amount) => ipc('vusd', ['mint', '--vault', vault, '--amount', String(amount)]),
  repay:           (vault, amount) => ipc('vusd', ['repay', '--vault', vault, '--amount', String(amount)]),
  closeVault:      (vault)         => ipc('vusd', ['close', '--vault', vault]),
  addCollateral:   (vault, sats)   => ipc('vusd', ['add-collateral', '--vault', vault, '--amount', String(sats)]),
  health:          (vault)         => ipc('vusd', ['health', '--vault', vault]),
  send:            (to, amount)    => ipc('vusd', ['send', '--to', to, '--amount', String(amount)]),
  listTransactions: ()              => ipc('listTransactions'),
}

export const vusd = bridge
