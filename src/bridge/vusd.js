const RELAY_URL  = 'http://127.0.0.1:8088'
const isElectron = typeof window !== 'undefined' && !!window.electron

// ── Mock responses ─────────────────────────────────────────────────────────────
// Only used when BOTH Electron IPC and the local API server are unavailable.
// Values reflect the real signet wallet state so offline mode is meaningful.

const MOCKS = {
  balance:         () => ({ btcSats: 0, vusdBalance: 5.00, btcPrice: 77431, outputs: 1 }),
  oracle:          () => ({ btcPrice: 77431, validSigs: 7 }),
  send:            () => ({ success: false, error: 'Not connected to node' }),
  receive:         () => ({ found: 0, outputs: [] }),
  openVault:       () => ({ vaultId: null, error: 'Not connected to node' }),
  mint:            () => ({ success: false, error: 'Not connected to node' }),
  repay:           () => ({ success: false, error: 'Not connected to node' }),
  closeVault:      () => ({ success: false, error: 'Not connected to node' }),
  health:          () => ({ state: 'Active', debt: 0, health: 999, collateral: 500000 }),
  generateAddress: (quantum = false) => {
    const spend = '620feb5d76791136e6997cec721eecc56e8e4aa6f3ebaafef09d4dc5c2e7ce09'
    const view  = 'ba53841ee14514d22f60fe09838a174304b3375570f8802d7ef7402cac8cc312'
    const node  = '033aa8a9931d43f825ca624beb6cfd5630cd324d94709ea1aa03679a1534044b87'
    const chan  = '327343303290585089'
    if (quantum) {
      const kyber = Array(2368).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join('')
      return { address: `vusd:${spend}:${view}:${kyber}:${node}:${chan}:${RELAY_URL}` }
    }
    return { address: `vusd:${spend}:${view}:${node}:${chan}:${RELAY_URL}` }
  },
  listVaults: () => ([{
    id:             'vault:fadff2dcecbd7e1b45b1cc816b01c9da4bff47a251a29948915d974f7508829f',
    state:          'Open',
    collateralSats: 500000,
    debt:           0,
    health:         999,
    vaultType:      'Classic',
  }]),
  keystoreStatus:  () => ({ version: 1, hasQuantumKeys: false }),
  networkStatus:   () => ({ bitcoindConnected: false, lndConnected: false, blockHeight: null, syncProgress: null }),
  nodeInfo:        () => ({ blockcount: null, peers: 0 }),
  faucet:          () => ({ success: false }),
  btcAddress:      () => (''),
  wallet:          () => ({ balance: 0, outputs: 0, history: [] }),
  transactions:    () => ([]),
}

// ── HTTP helpers (browser / API server) ───────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(`http://localhost:3001${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

async function apiGet(path) {
  const res = await fetch(`http://localhost:3001${path}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ── IPC / API dispatch ─────────────────────────────────────────────────────────
// Electron: window.electron.vusd(args)
// Browser:  POST localhost:3001/vusd  →  mock fallback

async function ipc(args) {
  if (isElectron) return window.electron.vusd(args)
  try { return await apiPost('/vusd', { args }) } catch {
    const cmd = args.find(a => !a.startsWith('-')) || ''
    const fn  = MOCKS[cmd]
    return fn ? fn() : { success: true }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const vusd = {

  /**
   * { btcSats, vusdBalance, btcPrice, outputs }
   *
   * Electron: BTC sats from bitcoin RPC + VUSD balance / BTC price from CLI.
   * Browser:  GET /balance  (server does both in one round-trip).
   */
  balance: () => {
    if (isElectron) {
      return Promise.all([
        window.electron.btcBalance().catch(() => 0),
        window.electron.readWallet().catch(() => ({})),
        window.electron.vusdOracle().catch(() => ({})),
      ]).then(([btc, wallet, oracle]) => ({
        btcSats:     Math.round((typeof btc === 'number' ? btc : 0) * 1e8),
        vusdBalance: wallet?.balance  ?? 0,
        btcPrice:    oracle?.btc_price ?? oracle?.['btc/usd'] ?? oracle?.btcPrice ?? null,
        outputs:     wallet?.outputs  ?? 0,
      }))
    }
    return apiGet('/balance')
      .then(r => ({
        btcSats:     r?.btcSats     ?? 0,
        vusdBalance: r?.vusdBalance ?? 0,
        btcPrice:    r?.btcPrice    ?? null,
        outputs:     r?.outputs     ?? 0,
      }))
      .catch(() => ({ ...MOCKS.balance(), btcSats: 0 }))
  },

  /** { btcPrice, validSigs } */
  oracle: () => {
    if (isElectron) {
      return window.electron.vusdOracle().catch(() => ({}))
        .then(r => ({
          btcPrice:  r?.btc_price ?? r?.['btc/usd'] ?? r?.btcPrice ?? null,
          validSigs: r?.valid_sigs ?? r?.oracles ?? null,
        }))
    }
    return apiPost('/vusd', { args: ['--signet', 'oracle'] })
      .then(r => ({ btcPrice: r?.btcPrice ?? null, validSigs: r?.validSigs ?? null }))
      .catch(() => MOCKS.oracle())
  },

  /** { success, txid, error } */
  send: (to, amount) =>
    ipc(['--signet', 'send', '--to', String(to), '--amount', String(amount)]),

  /** { found, outputs } */
  receive: (lndUrl, lndDir, relayUrl) =>
    ipc(['--signet', 'receive',
      '--lnd-url',   lndUrl   || 'https://localhost:8080',
      '--lnd-dir',   lndDir   || '/home/s6d/.lnd',
      '--relay-url', relayUrl || RELAY_URL,
    ]),

  /** { vaultId, success, error } */
  openVault: (sats, vaultType) => {
    const typeFlag =
      vaultType === 'QuantumUltra' ? ['--quantum-ultra'] :
      vaultType === 'QuantumStd'   ? ['--quantum-std']   : []
    return ipc(['--signet', 'open-vault', '--collateral', String(sats), ...typeFlag])
  },

  /** { success, error } */
  mint:      (vaultId, amount) => ipc(['--signet', 'mint',  '--vault', String(vaultId), '--amount', String(amount)]),
  repay:     (vaultId, amount) => ipc(['--signet', 'repay', '--vault', String(vaultId), '--amount', String(amount)]),
  closeVault:(vaultId)         => ipc(['--signet', 'close', '--vault', String(vaultId)]),

  /** { state, debt, health, collateral } */
  health: (vaultId) => ipc(['--signet', 'health', '--vault', String(vaultId)]),

  /** { address } — always includes --relay-url */
  generateAddress: (quantum = false) => {
    const args = ['--signet', 'generate-address', '--relay-url', RELAY_URL]
    if (quantum) args.push('--quantum')
    if (isElectron) {
      return window.electron.vusd(args)
        .then(r => ({ address: (r?.output || r?.address || '').trim().split('\n').filter(Boolean).pop() || '' }))
        .catch(() => ({ address: '' }))
    }
    return apiPost('/vusd', { args })
      .then(r => ({ address: r?.address || '' }))
      .catch(() => MOCKS.generateAddress(quantum))
  },

  /** Vault[] — normalised from vaults.json */
  listVaults: () => {
    if (isElectron) {
      const rfn = window.electron.readFile
      if (typeof rfn === 'function') {
        return rfn('/home/s6d/.vusd/vaults.json')
          .then(data => _normaliseVaults(data))
          .catch(() => _readVaultsLegacy())
      }
      return _readVaultsLegacy()
    }
    return apiGet('/vaults')
      .then(arr => Array.isArray(arr) ? arr : [])
      .catch(() => MOCKS.listVaults())
  },

  /** { version, hasQuantumKeys } */
  keystoreStatus: () => {
    if (isElectron) {
      return window.electron.vusd(['keystore', 'status'])
        .then(r => {
          const out = r?.output || ''
          const ver = out.match(/Version\s*:\s*v?(\d+)/)?.[1]
          return { version: ver ? parseInt(ver) : null, hasQuantumKeys: /hasQuantumKeys\s*:\s*true/i.test(out) }
        })
        .catch(() => MOCKS.keystoreStatus())
    }
    // Browser: call CLI via API server
    return apiPost('/vusd', { args: ['keystore', 'status'] })
      .then(r => ({
        version:        r?.version        ?? null,
        hasQuantumKeys: r?.hasQuantumKeys ?? (/hasQuantumKeys\s*:\s*true/i.test(r?.output || '')),
      }))
      .catch(() => MOCKS.keystoreStatus())
  },

  /** { bitcoindConnected, lndConnected, blockHeight, syncProgress } */
  networkStatus: () => {
    if (isElectron) {
      const nsf = window.electron.networkStatus
      if (typeof nsf === 'function') return nsf().catch(() => MOCKS.networkStatus())
      return window.electron.nodeInfo().catch(() => ({ blockcount: null, peers: 0 }))
        .then(r => ({
          bitcoindConnected: r?.blockcount != null,
          lndConnected:      false,
          blockHeight:       r?.blockcount ?? null,
          syncProgress:      null,
        }))
    }
    return apiGet('/network-status')
      .catch(() => MOCKS.networkStatus())
  },
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function _bytesToHex(arr) {
  if (!Array.isArray(arr)) return typeof arr === 'string' ? arr : ''
  return arr.map(b => b.toString(16).padStart(2, '0')).join('')
}

function _readVaultsLegacy() {
  return window.electron.readVaults().catch(() => ({}))
    .then(data => _normaliseVaults(data))
}

function _normaliseVaults(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  return Object.entries(data).map(([id, v]) => ({
    id,
    state:           v.state === 'Active' ? 'Open' : (v.state || 'Unknown'),
    collateralSats:  v.locked_btc          ?? v.collateralSats ?? 0,
    debt:            _normDebt(v.debt_vusd ?? v.debt ?? 0),
    health:          v.health_cr           ?? v.health ?? null,
    vaultType:       v.vault_type          ?? getVaultType(id),
    openedAt:        v.open_timestamp      ?? v.openedAt      ?? 0,
    lastUpdated:     v.last_updated        ?? v.lastUpdated    ?? 0,
    openFeeSats:     v.open_fee_paid_sats  ?? v.openFeeSats    ?? 0,
    ownerPubkey:     _bytesToHex(v.owner_pubkey)      || (v.ownerPubkey ?? ''),
    ownerPubkeyFull: _bytesToHex(v.owner_pubkey_full) || (v.ownerPubkeyFull ?? ''),
    taprootTxid:     Array.isArray(v.taproot_utxo?.txid)
                       ? [...v.taproot_utxo.txid].reverse().map(b => b.toString(16).padStart(2,'0')).join('')
                       : (v.taprootTxid ?? v.taproot_txid ?? ''),
    liqPrice:        v.liq_price           ?? null,
  }))
}

function _normDebt(raw) {
  if (typeof raw !== 'number') return 0
  return raw > 1e15 ? raw / 1e18 : raw
}

// ── Legacy bridge aliases ──────────────────────────────────────────────────────
// Identical behaviour in Electron and browser dev mode.

export const bridge = {

  /** Returns BTC balance in BTC (float) */
  btcBalance: () => vusd.balance().then(b => b.btcSats / 1e8),

  /** Returns existing bitcoin address for the wallet */
  btcAddress: () => {
    if (isElectron) return window.electron.btcAddress().catch(() => '')
    return apiGet('/btc-address')
      .then(r => r?.address || '')
      .catch(() => '')
  },

  /** Generates a fresh one-time deposit address */
  btcNewAddress: () => {
    if (isElectron) return window.electron.btcNewAddress().catch(() => '')
    return apiPost('/btc-new-address', {})
      .then(r => r?.address || '')
      .catch(() => '')
  },

  /** { balance, outputs, btcPrice } */
  vusdBalance: () => vusd.balance().then(b => ({ balance: b.vusdBalance, outputs: b.outputs, btcPrice: b.btcPrice })),

  /** { [vaultId]: vaultObj } map — from vaults.json */
  readVaults: () => vusd.listVaults().then(arr => {
    const map = {}; arr.forEach(v => { map[v.id] = v }); return map
  }),

  /** Raw JSON string of vaults.json */
  readVaultsRaw: () => {
    if (isElectron) return window.electron.readVaultsRaw().catch(() => '{}')
    return apiGet('/vaults').then(arr => JSON.stringify(arr)).catch(() => '{}')
  },

  /** { balance, outputs, history } */
  readWallet: () => {
    if (isElectron) return window.electron.readWallet().catch(() => ({ balance: 0 }))
    return apiGet('/wallet').catch(() => MOCKS.wallet())
  },

  /** Send faucet BTC to address (signet only) */
  faucet: (addr) => {
    if (isElectron) return window.electron.faucet(addr).catch(e => ({ error: e.message }))
    return apiPost('/faucet', { address: addr }).catch(e => ({ error: e.message }))
  },

  /** CLI oracle */
  oracle: () => vusd.oracle(),

  /** VUSD address generation */
  generateAddress: (quantum) => vusd.generateAddress(quantum),

  /** Vault operations */
  openVault:    (sats, vaultType)   => vusd.openVault(sats, vaultType),
  mint:         (vault, amount)     => vusd.mint(vault, amount),
  repay:        (vault, amount)     => vusd.repay(vault, amount),
  closeVault:   (vault)             => vusd.closeVault(vault),

  /** Add collateral — uses ipc() so it works in both modes */
  addCollateral: (vault, sats) =>
    ipc(['--signet', 'add-collateral', '--vault', vault, '--amount', String(sats)]),

  /** Vault health */
  health: (vault) => vusd.health(vault),

  /** VUSD send */
  send: (to, amount) => vusd.send(to, amount),

  /** List recent bitcoin transactions */
  listTransactions: () => {
    if (isElectron) return window.electron.listTransactions().catch(() => [])
    return apiGet('/transactions').catch(() => [])
  },

  /** Bitcoin node info { blockcount, peers } */
  nodeInfo: () => {
    if (isElectron) return window.electron.nodeInfo().catch(() => ({ blockcount: null, peers: 0 }))
    return apiGet('/node-info').catch(() => MOCKS.nodeInfo())
  },

  /** Migrate vault to quantum */
  migrateVault: (vaultId, target) =>
    ipc(['--signet', 'migrate-vault', '--vault', String(vaultId), '--to', String(target)]),

  /** Keystore status */
  keystoreStatus: () => vusd.keystoreStatus(),
}

// ── Vault type helpers ─────────────────────────────────────────────────────────

export function getVaultType(id) {
  if (!id) return 'Classic'
  if (id.startsWith('vault-qu:')) return 'QuantumUltra'
  if (id.startsWith('vault-q:'))  return 'QuantumStd'
  return 'Classic'
}

export function truncateVaultId(id) {
  if (!id) return ''
  const prefixEnd   = id.indexOf(':') + 1
  const secondColon = id.indexOf(':', prefixEnd)
  const hexStart    = secondColon > 0 ? secondColon + 1 : prefixEnd
  const prefix      = id.slice(0, hexStart)
  const hex         = id.slice(hexStart)
  if (hex.length <= 16) return id
  return `${prefix}${hex.slice(0, 8)}…${hex.slice(-8)}`
}

export function mainnetConfirm(network, action) {
  if (network !== 'mainnet') return true
  return window.confirm(
    `⚠ MAINNET — Real Bitcoin at stake\n\nYou are about to: ${action}\n\nThis cannot be undone. Confirm?`
  )
}
