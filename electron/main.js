const { app, BrowserWindow, ipcMain, session } = require("electron")
const { spawn, execSync }                       = require("child_process")
const path                                      = require("path")
const fs                                        = require("fs")
const os                                        = require("os")
const http                                      = require("http")

const IS_WIN     = process.platform === "win32"
const VUSD_WSL   = "/home/s6d/.vusd/run_vusd.sh"
const VAULTS_PATH = path.join(os.homedir(), ".vusd", "vaults.json")
const WALLET_PATH = path.join(os.homedir(), ".vusd", "wallet.json")

let currentNetwork = "signet"
const getRpcPort = () => currentNetwork === "mainnet" ? 8332 : 38332
const getRpcUser = () => currentNetwork === "mainnet" ? "bitcoin" : "vusd"
const getRpcPass = () => currentNetwork === "mainnet" ? "bitcoin" : "vusd_rpc_password"

// Signing keys — process.env takes priority; fall back to dev/signet constants.
// In production, set VUSD_OWNER_SEED_HEX and VUSD_SIGNING_KEY_HEX before launch.
const VENV = {
  VUSD_OWNER_SEED_HEX:  process.env.VUSD_OWNER_SEED_HEX  || "8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038",
  VUSD_SIGNING_KEY_HEX: process.env.VUSD_SIGNING_KEY_HEX || "855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e",
}

// On Windows, share VENV vars into WSL via the WSLENV mechanism.
// "/u" suffix means: copy from Windows env into Linux env as-is (no path translation).
const WSL_ENV_SHARE = "VUSD_OWNER_SEED_HEX/u:VUSD_SIGNING_KEY_HEX/u:VUSD_CHANGE_ADDRESS/u"

/** Build the env object for a WSL spawn — includes VENV and WSLENV. */
function wslEnv(extra = {}) {
  return { ...VENV, ...extra, WSLENV: WSL_ENV_SHARE }
}

// ── Process runner ─────────────────────────────────────────────────────────────

function run(bin, args, env = {}) {
  return new Promise((resolve, reject) => {
    const spawnEnv = { ...process.env, ...env }
    const proc = spawn(bin, args, { env: spawnEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    const timeout = setTimeout(() => {
      proc.kill()
      console.error("TIMEOUT:", bin, args.join(" "))
      reject(new Error("timeout"))
    }, 60000)
    let out = "", err = ""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(err.trim() || "exit " + code))
      const t  = out.trim()
      const tc = t.replace(/\x1B\[[0-9;]*[mGKHF]/g, "").replace(/\[\d+[mGKH]/g, "")
      try { resolve(JSON.parse(tc)) } catch {
        const n = parseFloat(tc)
        if (!isNaN(n)) resolve(n)
        else resolve({ output: tc })
      }
    })
    proc.on("error", reject)
  })
}

async function readWslFile(wslPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("wsl.exe", ["-e", "cat", wslPath], { stdio: ["ignore", "pipe", "pipe"] })
    let out = ""
    proc.stdout.on("data", d => out += d.toString())
    proc.stderr.on("data", () => {})
    const t = setTimeout(() => { proc.kill(); reject(new Error("timeout")) }, 10000)
    proc.on("close", code => {
      clearTimeout(t)
      if (code !== 0) return reject(new Error("cat exit " + code))
      resolve(out)
    })
  })
}

// ── Bitcoin RPC ────────────────────────────────────────────────────────────────

function btcRpc(method, params = [], wallet = "") {
  return new Promise((resolve, reject) => {
    const body       = JSON.stringify({ jsonrpc: "1.0", id: "vultd", method, params })
    const walletPath = wallet ? "/wallet/" + wallet : "/"
    const opts = {
      hostname: "127.0.0.1", port: getRpcPort(), path: walletPath, method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": "Basic " + Buffer.from(getRpcUser() + ":" + getRpcPass()).toString("base64"),
      },
    }
    const req = http.request(opts, res => {
      let data = ""
      res.on("data", d => data += d)
      res.on("end", () => {
        try {
          const r = JSON.parse(data)
          if (r.error) return reject(new Error(r.error.message))
          resolve(r.result)
        } catch(e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("RPC timeout")) })
    req.write(body); req.end()
  })
}

// ── Vault normalisation ────────────────────────────────────────────────────────

function bytesToHex(arr) {
  if (!Array.isArray(arr)) return typeof arr === "string" ? arr : ""
  return arr.map(b => b.toString(16).padStart(2, "0")).join("")
}

function normaliseVaults(raw) {
  const result = {}
  for (const [id, v] of Object.entries(raw || {})) {
    const debtRaw = v.debt_vusd ?? 0
    result[id] = {
      ...v,
      debt_vusd: typeof debtRaw === "number" && debtRaw > 1e15 ? debtRaw / 1e18 : debtRaw,
    }
  }
  return result
}

function normaliseVaultsArray(raw) {
  if (!raw || typeof raw !== "object") return []
  const entries = Array.isArray(raw) ? raw.map(v => [v.id, v]) : Object.entries(raw)
  return entries.map(([id, v]) => ({
    id,
    state:           v.state === "Active" ? "Open" : (v.state || "Unknown"),
    collateralSats:  v.locked_btc         ?? v.collateralSats ?? 0,
    debt:            (() => { const d = v.debt_vusd ?? v.debt ?? 0; return typeof d === "number" && d > 1e15 ? d / 1e18 : d })(),
    health:          v.health_cr          ?? v.health         ?? null,
    vaultType:       v.vault_type         ?? (id.startsWith("vault-qu:") ? "QuantumUltra" : id.startsWith("vault-q:") ? "QuantumStd" : "Classic"),
    openedAt:        v.open_timestamp     ?? 0,
    lastUpdated:     v.last_updated       ?? 0,
    openFeeSats:     v.open_fee_paid_sats ?? 0,
    ownerPubkey:     bytesToHex(v.owner_pubkey)      || (v.ownerPubkey ?? ""),
    ownerPubkeyFull: bytesToHex(v.owner_pubkey_full) || (v.ownerPubkeyFull ?? ""),
    taprootTxid:     Array.isArray(v.taproot_utxo?.txid)
                       ? [...v.taproot_utxo.txid].reverse().map(b => b.toString(16).padStart(2,"0")).join("")
                       : (v.taprootTxid ?? v.taproot_txid ?? ""),
    liqPrice:        v.liq_price          ?? null,
  }))
}

// ── Output parsers ─────────────────────────────────────────────────────────────

function stripAnsi(str) {
  return (str || "").replace(/\x1B\[[0-9;]*[mGKHF]/g, "").replace(/\[\d+m/g, "")
}

function parseVusd(text) {
  const r = {}
  for (const line of (text || "").split("\n")) {
    const m = line.match(/^\s+([^:]+?)\s*:\s*\$?([\d.,]+)/)
    if (m) r[m[1].trim().toLowerCase().replace(/\s+/g, "_")] = parseFloat(m[2].replace(/,/g, ""))
  }
  return r
}

// ── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600,
    titleBarStyle: "hiddenInset", backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "connect-src 'self' https://api.coingecko.com https://api.coinbase.com http://127.0.0.1:* http://localhost:*; " +
          "img-src 'self' data:;",
        ],
      },
    })
  })

  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else win.loadFile(path.join(__dirname, "../dist/index.html"))
}

// ── IPC: vusd CLI ──────────────────────────────────────────────────────────────

ipcMain.handle("vusd", async (_, args) => {
  const bin     = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
  const wslArgs = IS_WIN ? ["-e", VUSD_WSL, ...args] : args
  return run(bin, wslArgs, IS_WIN ? wslEnv() : VENV)
})

// ── IPC: network ───────────────────────────────────────────────────────────────

ipcMain.handle("set-network", (_, network) => {
  currentNetwork = network
  return { network: currentNetwork, port: getRpcPort() }
})

// ── IPC: BTC wallet ────────────────────────────────────────────────────────────

ipcMain.handle("btc-balance", async () => {
  try { return await btcRpc("getbalance", [], "vusd") } catch { return 0 }
})

ipcMain.handle("btc-new-address", async () => {
  try { return await btcRpc("getnewaddress", ["one-time"], "vusd") } catch { return "" }
})

ipcMain.handle("btc-address", async () => {
  try {
    const addrs   = await btcRpc("getaddressesbylabel", [""], "vusd")
    const existing = Object.keys(addrs || {}).find(a => a.startsWith("tb1") || a.startsWith("bc1"))
    if (existing) return existing
    return await btcRpc("getnewaddress", [], "vusd")
  } catch { return "" }
})

ipcMain.handle("bitcoin-cli", async (_, args) => {
  try { return await btcRpc(args[0], args.slice(1), "vusd") }
  catch(e) { console.error("bitcoin-cli:", e.message); return { error: e.message } }
})

// ── IPC: vault + wallet files ──────────────────────────────────────────────────

ipcMain.handle("read-vaults", async () => {
  try {
    let vaultData = {}
    if (IS_WIN) {
      try {
        const rv = await run("wsl.exe", ["-e", VUSD_WSL, "cat-vaults"], wslEnv())
        if (typeof rv === "object" && rv !== null && !rv.output) {
          vaultData = rv
        } else if (rv?.output) {
          try { vaultData = JSON.parse(rv.output) } catch { /* ignore */ }
        }
      } catch(e) { console.error("read-vaults cat-vaults:", e.message) }
    } else {
      try { vaultData = JSON.parse(fs.readFileSync(VAULTS_PATH, "utf8")) }
      catch(e) { console.error("read-vaults file:", e.message) }
    }
    return normaliseVaults(vaultData)
  } catch(e) { console.error("read-vaults:", e.message); return {} }
})

ipcMain.handle("read-vaults-raw", async () => {
  try {
    if (IS_WIN) return await readWslFile("/home/s6d/.vusd/vaults.json")
    return fs.readFileSync(VAULTS_PATH, "utf8")
  } catch(e) { console.error("read-vaults-raw:", e.message); return "{}" }
})

/**
 * read-file: read an arbitrary file path (WSL path on Windows, native on Linux/Mac)
 * and return parsed JSON. Vaults files are normalised to Vault[].
 */
ipcMain.handle("read-file", async (_, filePath) => {
  try {
    let raw
    if (IS_WIN) {
      raw = await readWslFile(filePath)
    } else {
      raw = fs.readFileSync(filePath, "utf8")
    }
    const data = JSON.parse(raw)
    if (typeof filePath === "string" && filePath.includes("vaults.json")) {
      return normaliseVaultsArray(data)
    }
    return data
  } catch(e) {
    console.error("read-file:", filePath, e.message)
    return null
  }
})

ipcMain.handle("read-wallet", async () => {
  try {
    if (IS_WIN) {
      const r = await run("wsl.exe", ["-e", VUSD_WSL, "cat-wallet"], wslEnv())
      if (r && typeof r === "object" && r.balance !== undefined) {
        return { balance: r.balance, outputs: r.outputs || 0, history: [] }
      }
    }
    const raw     = fs.readFileSync(WALLET_PATH, "utf8")
    const outputs = JSON.parse(raw)
    const unspent = Array.isArray(outputs) ? outputs.filter(o => !o.spent) : []
    const totalRaw = unspent.reduce((sum, o) => sum + (typeof o.amount === "number" ? o.amount : 0), 0)
    return { balance: parseFloat((totalRaw / 1e18).toFixed(2)), outputs: unspent.length, history: [] }
  } catch(e) { console.error("read-wallet:", e.message); return { balance: 0, outputs: 0, history: [] } }
})

// ── IPC: VUSD + oracle parsed ──────────────────────────────────────────────────

ipcMain.handle("vusd-balance-parsed", async () => {
  try {
    const bin  = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    const args = IS_WIN ? ["-e", VUSD_WSL, "balance"] : ["--signet", "balance"]
    const r    = await run(bin, args, IS_WIN ? wslEnv() : VENV)
    return parseVusd(stripAnsi(r.output || ""))
  } catch(e) { console.error("vusd-balance-parsed:", e.message); return {} }
})

ipcMain.handle("vusd-oracle-parsed", async () => {
  try {
    const bin  = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    const args = IS_WIN ? ["-e", VUSD_WSL, "oracle"] : ["--signet", "oracle"]
    const r    = await run(bin, args, IS_WIN ? wslEnv() : VENV)
    return parseVusd(stripAnsi(r.output || ""))
  } catch(e) { console.error("vusd-oracle-parsed:", e.message); return {} }
})

// ── IPC: node info + network status ───────────────────────────────────────────

ipcMain.handle("node-info", async () => {
  try {
    const [blocks, peers] = await Promise.allSettled([btcRpc("getblockcount"), btcRpc("getpeerinfo")])
    return {
      blockcount: blocks.status === "fulfilled" ? blocks.value : null,
      peers:      peers.status  === "fulfilled" ? (Array.isArray(peers.value) ? peers.value.length : 0) : 0,
    }
  } catch { return { blockcount: null, peers: 0 } }
})

/**
 * network-status: structured status for Settings page.
 * Checks bitcoind via RPC and optionally LND via lncli (Linux only).
 */
ipcMain.handle("network-status", async () => {
  let bitcoindConnected = false
  let lndConnected      = false
  let blockHeight       = null

  // Bitcoin Core
  try {
    const count = await btcRpc("getblockcount")
    if (typeof count === "number") { bitcoindConnected = true; blockHeight = count }
  } catch { /* offline */ }

  // LND — Linux/WSL only; on Windows this would need lncli on WSL path
  if (!IS_WIN) {
    try {
      execSync("lncli --network=signet getinfo", { env: { ...process.env, ...VENV }, timeout: 5000 })
      lndConnected = true
    } catch { /* offline */ }
  }

  return { bitcoindConnected, lndConnected, blockHeight, syncProgress: bitcoindConnected ? 100 : null }
})

// ── IPC: transactions + faucet ─────────────────────────────────────────────────

ipcMain.handle("list-transactions", async () => {
  try {
    const txs = await btcRpc("listtransactions", ["*", 20], "vusd")
    return txs.reverse().map(tx => ({
      txid:          tx.txid,
      category:      tx.category,
      amount:        tx.amount,
      fee:           tx.fee || 0,
      confirmations: tx.confirmations,
      time:          tx.time,
      address:       tx.address,
    }))
  } catch { return [] }
})

ipcMain.handle("faucet", async (_, address) => {
  try { return await btcRpc("sendtoaddress", [address, 0.0001], "vusd") }
  catch(e) { return { error: e.message } }
})

// ── Boot ───────────────────────────────────────────────────────────────────────

if (IS_WIN) app.commandLine.appendSwitch("no-sandbox")
app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
