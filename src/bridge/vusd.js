const isElectron = typeof window !== 'undefined' && !!window.electron

// ── Mock responses ────────────────────────────────────────────────────────────
// All mocks return clearly empty state — no pre-filled user-visible data.

const MOCKS = {
  balance:        () => ({ btcSats: 0, vusdBalance: 0 }),
  oracle:         () => ({ btcUsdPrice: null, change24h: null }),
  send:           () => ({ success: false, txid: null, error: 'Not connected to node' }),
  receive:        () => ({ found: 0, outputs: [] }),
  openVault:      () => ({ vaultId: null, error: 'Not connected to node' }),
  mint:           () => ({ success: false, error: 'Not connected to node' }),
  repay:          () => ({ success: false, error: 'Not connected to node' }),
  closeVault:     () => ({ success: false, error: 'Not connected to node' }),
  health:         () => ({ state: null, debt: 0, health: 0, collateral: 0 }),
  generateAddress: (quantum = false) => {
    const mockSpend = '620feb5d76791136e6997cec721eecc56e8e4aa6f3ebaafef09d4dc5c2e7ce09'
    const mockView  = 'ba53841ee14514d22f60fe09838a174304b3375570f8802d7ef7402cac8cc312'
    const mockNode  = '033aa8a9931d43f825ca624beb6cfd5630cd324d94709ea1aa03679a1534044b87'
    const mockChan  = '327343303290585089'
    const mockRelay = 'http://127.0.0.1:8088'
    if (quantum) {
      const mockKyber = Array(2368).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join('')
      return { address: `vusd:${mockSpend}:${mockView}:${mockKyber}:${mockNode}:${mockChan}:${mockRelay}` }
    }
    return { address: `vusd:${mockSpend}:${mockView}:${mockNode}:${mockChan}:${mockRelay}` }
  },
  listVaults:     () => ([]),
  keystoreStatus: () => ({ version: null, hasQuantumKeys: false }),
  networkStatus:  () => ({ bitcoindConnected: false, lndConnected: false, blockHeight: null, syncProgress: null }),
  faucet:         () => ({ success: false }),
  btcAddress:     () => (''),
}

// ── IPC dispatch ──────────────────────────────────────────────────────────────

async function ipc(method, ...args) {
  if (!isElectron) {
    const fn = MOCKS[method]
    return fn ? fn(...args) : {}
  }
  try {
    // All methods go through the single 'vusd' IPC channel as [method, ...args]
    return await window.electron.vusd([method, ...args.map(a => String(a))])
  } catch (e) {
    console.error('IPC error', method, e)
    const fn = MOCKS[method]
    return fn ? fn(...args) : {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const vusd = {
  /** { btcSats, vusdBalance } */
  balance: () => isElectron
    ? Promise.all([
        window.electron.btcBalance().catch(() => 0),
        window.electron.vusdBalance().catch(() => ({ balance: 0 })),
      ]).then(([btc, vusd]) => ({
        btcSats:     Math.round((typeof btc === 'number' ? btc : 0) * 1e8),
        vusdBalance: vusd?.balance ?? 0,
      }))
    : Promise.resolve(MOCKS.balance()),

  /** { btcUsdPrice, change24h } — fetched directly; IPC not needed */
  oracle: () => Promise.resolve(MOCKS.oracle()),

  /** { success, txid } */
  send: (to, amount) => ipc('send', to, amount),

  /** { found, outputs } */
  receive: (lndUrl, lndDir, relayUrl) => ipc('receive', lndUrl || '', lndDir || '', relayUrl || ''),

  /** { vaultId } */
  openVault: (sats, vaultType) => isElectron
    ? window.electron.vusd(
        vaultType === 'QuantumStd'   ? ['open-vault', '--signet', '--collateral', String(sats), '--quantum-std'] :
        vaultType === 'QuantumUltra' ? ['open-vault', '--signet', '--collateral', String(sats), '--quantum-ultra'] :
                                       ['open-vault', '--signet', '--collateral', String(sats)]
      ).catch(e => ({ error: e.message }))
    : Promise.resolve(MOCKS.openVault()),

  /** { success } */
  mint: (vaultId, amount) => isElectron
    ? window.electron.vusd(['--signet', 'mint', '--vault', String(vaultId), '--amount', String(amount)])
        .catch(e => ({ error: e.message }))
    : Promise.resolve(MOCKS.mint()),

  /** { success } */
  repay: (vaultId, amount) => isElectron
    ? window.electron.vusd(['--signet', 'repay', '--vault', String(vaultId), '--amount', String(amount)])
        .catch(e => ({ error: e.message }))
    : Promise.resolve(MOCKS.repay()),

  /** { success } */
  closeVault: (vaultId) => isElectron
    ? window.electron.vusd(['--signet', 'close', '--vault', String(vaultId)])
        .catch(e => ({ error: e.message }))
    : Promise.resolve(MOCKS.closeVault()),

  /** { state, debt, health, collateral } */
  health: (vaultId) => isElectron
    ? window.electron.vusd(['--signet', 'health', '--vault', String(vaultId)])
        .catch(() => MOCKS.health())
    : Promise.resolve(MOCKS.health()),

  /** { address } */
  generateAddress: (quantum = false) => isElectron
    ? window.electron.vusd(quantum ? ['--signet', 'generate-address', '--quantum'] : ['--signet', 'generate-address'])
        .then(r => ({ address: r?.output?.trim() || r?.address || '' }))
        .catch(() => ({ address: '' }))
    : Promise.resolve(MOCKS.generateAddress()),

  /** Vault[] from vaults.json */
  listVaults: () => isElectron
    ? window.electron.readVaults().catch(() => ({}))
        .then(data => Object.entries(data || {}).map(([id, v]) => ({ id, ...v })))
    : Promise.resolve(MOCKS.listVaults()),

  /** { version, hasQuantumKeys } */
  keystoreStatus: () => isElectron
    ? window.electron.vusd(['keystore', 'status'])
        .then(r => {
          const out = r?.output || ''
          const ver = out.match(/Version\s*:\s*v(\d+)/)?.[1]
          return { version: ver ? parseInt(ver) : null, hasQuantumKeys: out.includes('quantum') }
        })
        .catch(() => MOCKS.keystoreStatus())
    : Promise.resolve(MOCKS.keystoreStatus()),

  /** { bitcoindConnected, lndConnected, blockHeight, syncProgress } */
  networkStatus: () => isElectron
    ? window.electron.nodeInfo().catch(() => ({ blockcount: null, peers: 0 }))
        .then(r => ({
          bitcoindConnected: r?.blockcount != null,
          lndConnected:      false,
          blockHeight:       r?.blockcount ?? null,
          syncProgress:      null,
        }))
    : Promise.resolve(MOCKS.networkStatus()),
}

// Legacy alias used by existing components
export const bridge = {
  btcBalance:      () => vusd.balance().then(b => b.btcSats / 1e8),
  btcAddress:      () => isElectron ? window.electron.btcAddress().catch(() => '') : Promise.resolve(''),
  btcNewAddress:   () => isElectron ? window.electron.btcNewAddress().catch(() => '') : Promise.resolve(''),
  vusdBalance:     () => vusd.balance().then(b => ({ balance: b.vusdBalance, outputs: 0 })),
  readVaults:      () => vusd.listVaults().then(arr => {
    const map = {}; arr.forEach(v => { map[v.id] = v }); return map
  }),
  readVaultsRaw:   () => isElectron ? window.electron.readVaultsRaw().catch(() => '{}') : Promise.resolve('{}'),
  readWallet:      () => isElectron ? window.electron.readWallet().catch(() => ({ balance: 0 })) : Promise.resolve({ balance: 0 }),
  faucet:          (addr) => isElectron ? window.electron.faucet(addr).catch(e => ({ error: e.message })) : Promise.resolve(MOCKS.faucet()),
  oracle:          () => isElectron ? window.electron.vusdOracle().catch(() => ({})) : Promise.resolve({}),
  generateAddress: (quantum) => vusd.generateAddress(quantum),
  openVault:       (sats, vaultType) => vusd.openVault(sats, vaultType),
  mint:            (vault, amount) => vusd.mint(vault, amount),
  repay:           (vault, amount) => vusd.repay(vault, amount),
  closeVault:      (vault) => vusd.closeVault(vault),
  addCollateral:   (vault, sats) => isElectron
    ? window.electron.vusd(['--signet', 'add-collateral', '--vault', vault, '--amount', String(sats)]).catch(e => ({ error: e.message }))
    : Promise.resolve({ error: 'Not connected' }),
  health:          (vault) => vusd.health(vault),
  send:            (to, amount) => vusd.send(to, amount),
  listTransactions:() => isElectron ? window.electron.listTransactions().catch(() => []) : Promise.resolve([]),
  nodeInfo:        () => isElectron ? window.electron.nodeInfo().catch(() => ({ blockcount: null, peers: 0 })) : Promise.resolve({ blockcount: null, peers: 0 }),
  migrateVault:    (vaultId, target) => isElectron
    ? window.electron.vusd(['--signet', 'migrate-vault', '--vault', String(vaultId), '--to', String(target)])
        .catch(e => ({ error: e.message }))
    : Promise.resolve({ error: 'Not connected' }),
  keystoreStatus:  () => vusd.keystoreStatus(),
}

// ── Vault type helpers ────────────────────────────────────────────────────────

/** Derive VaultType string from a vault ID's prefix. */
export function getVaultType(id) {
  if (!id) return 'Classic'
  if (id.startsWith('vault-qu:')) return 'QuantumUltra'
  if (id.startsWith('vault-q:'))  return 'QuantumStd'
  return 'Classic'
}

/** Shorten a vault ID for display: preserve prefix + first8 + '…' + last8 hex chars. */
export function truncateVaultId(id) {
  if (!id) return ''
  const prefixEnd = id.indexOf(':') + 1
  // Find second colon for vault-q: and vault-qu: prefixes
  const secondColon = id.indexOf(':', prefixEnd)
  const hexStart = secondColon > 0 ? secondColon + 1 : prefixEnd
  const prefix = id.slice(0, hexStart)
  const hex    = id.slice(hexStart)
  if (hex.length <= 16) return id
  return `${prefix}${hex.slice(0, 8)}…${hex.slice(-8)}`
}

// ── Confirmation helper (mainnet guard) ───────────────────────────────────────

/**
 * Show a confirmation dialog on mainnet before destructive operations.
 * Returns true if the user confirms (or if on testnet/signet).
 * `network`: string from node config, e.g. 'mainnet', 'signet', 'testnet'
 * `action`:  human-readable description of the action
 */
export function mainnetConfirm(network, action) {
  if (network !== 'mainnet') return true
  return window.confirm(
    `⚠ MAINNET — Real Bitcoin at stake\n\nYou are about to: ${action}\n\nThis cannot be undone. Confirm?`
  )
}
