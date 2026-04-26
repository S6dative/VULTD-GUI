/**
 * VUSD local API server — browser dev mode (npm run dev:full).
 * Provides identical data to the Electron IPC layer, without Electron.
 * Runs on the same machine as the vusd binary and bitcoind.
 *
 * Platform-aware: uses wsl.exe on Windows, direct exec on Linux/Mac.
 */

const express  = require("express")
const { execSync, spawnSync } = require("child_process")
const http     = require("http")
const fs       = require("fs")
const path     = require("path")
const os       = require("os")
const cors     = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

// ── Config ─────────────────────────────────────────────────────────────────────

const IS_WIN    = process.platform === "win32"
const HOME      = process.env.HOME || (IS_WIN ? "/home/s6d" : os.homedir())
const VUSD_DATA = path.join(IS_WIN ? os.homedir() : HOME, ".vusd")

// Linux/WSL binary path (always the WSL path since the binary is compiled for Linux)
const VUSD_WSL_BIN = process.env.VUSD_BIN
  || "/mnt/c/Users/AK111/Downloads/vusd-protocol-v34/vusd-protocol/target/release/vusd"

const ENV = {
  ...process.env,
  VUSD_OWNER_SEED_HEX:  process.env.VUSD_OWNER_SEED_HEX  || "8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038",
  VUSD_SIGNING_KEY_HEX: process.env.VUSD_SIGNING_KEY_HEX || "855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e",
}

// Bitcoin RPC credentials (signet)
const RPC_PORT = parseInt(process.env.BITCOIN_RPC_PORT || "38332", 10)
const RPC_USER = process.env.BITCOIN_RPC_USER || "vusd"
const RPC_PASS = process.env.BITCOIN_RPC_PASS || "vusd_rpc_password"
const RPC_WALLET = "vusd"

// ── Bitcoin HTTP JSON-RPC ──────────────────────────────────────────────────────
// Uses HTTP directly — no bitcoin-cli needed, works from Windows or WSL.

function btcRpc(method, params = [], wallet = RPC_WALLET) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: "1.0", id: "vultd-server", method, params })
    const walletPath = wallet ? `/wallet/${wallet}` : "/"
    const opts = {
      hostname: "127.0.0.1",
      port:     RPC_PORT,
      path:     walletPath,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization":  "Basic " + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64"),
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
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("RPC timeout")) })
    req.write(body)
    req.end()
  })
}

// ── vusd CLI runner ────────────────────────────────────────────────────────────
// On Windows: spawns via wsl.exe so the Linux binary can run.
// On Linux/Mac: spawns directly.

function runVusd(args, timeout = 45000) {
  // Get a fresh VUSD_CHANGE_ADDRESS before every mutating command
  let changeAddr = ""
  try {
    if (IS_WIN) {
      const r = spawnSync("wsl.exe", ["-e", "bitcoin-cli", "-signet", "-rpcwallet=vusd", "getnewaddress"],
        { env: ENV, timeout: 8000, encoding: "utf8" })
      if (r.status === 0) changeAddr = r.stdout.trim()
    } else {
      changeAddr = execSync("bitcoin-cli -signet -rpcwallet=vusd getnewaddress",
        { env: ENV, timeout: 8000 }).toString().trim()
    }
  } catch { /* bitcoind may not be running */ }

  const fullEnv = { ...ENV, ...(changeAddr ? { VUSD_CHANGE_ADDRESS: changeAddr } : {}) }

  let result
  if (IS_WIN) {
    result = spawnSync("wsl.exe", ["-e", VUSD_WSL_BIN, ...args],
      { env: { ...fullEnv, WSLENV: "VUSD_OWNER_SEED_HEX/u:VUSD_SIGNING_KEY_HEX/u:VUSD_CHANGE_ADDRESS/u" },
        timeout, encoding: "utf8" })
  } else {
    result = spawnSync(VUSD_WSL_BIN, args, { env: fullEnv, timeout, encoding: "utf8" })
  }

  if (result.status !== 0) throw new Error(result.stderr?.trim() || `exit ${result.status}`)
  return result.stdout || ""
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function bytesToHex(arr) {
  if (!Array.isArray(arr)) return typeof arr === "string" ? arr : ""
  return arr.map(b => b.toString(16).padStart(2, "0")).join("")
}

/** Read wallet.json (WSL path on Windows) and sum unspent outputs at 18-decimal scale. */
function readWalletJson() {
  let data
  if (IS_WIN) {
    const r = spawnSync("wsl.exe", ["-e", "cat", "/home/s6d/.vusd/wallet.json"],
      { timeout: 10000, encoding: "utf8" })
    if (r.status !== 0) throw new Error("wsl cat wallet.json failed")
    data = JSON.parse(r.stdout)
  } else {
    data = JSON.parse(fs.readFileSync(path.join(HOME, ".vusd", "wallet.json"), "utf8"))
  }
  const outputs = Array.isArray(data) ? data : []
  const unspent = outputs.filter(o => !o.spent)
  const totalRaw = unspent.reduce((sum, o) => sum + (typeof o.amount === "number" ? o.amount : 0), 0)
  return { balance: parseFloat((totalRaw / 1e18).toFixed(2)), outputs: unspent.length }
}

// ── CLI output parsers ─────────────────────────────────────────────────────────

function stripAnsi(s) {
  return (s || "").replace(/\x1B\[[0-9;]*[mGKHF]/g, "").replace(/\[\d+m/g, "")
}

function parseBalance(stdout) {
  const s    = stripAnsi(stdout)
  const vusdM = s.match(/VUSD balance\s*:\s*\$?([\d.,]+)/i)
  const btcPM = s.match(/BTC price\s*:\s*\$?([\d.,]+)/i)
  const outsM = s.match(/Outputs held\s*:\s*(\d+)/i)
  return {
    vusdBalance: vusdM ? parseFloat(vusdM[1].replace(/,/g, "")) : 0,
    btcPrice:    btcPM ? parseFloat(btcPM[1].replace(/,/g, "")) : 0,
    outputs:     outsM ? parseInt(outsM[1])                      : 0,
  }
}

function parseCliOutput(stdout, args) {
  const cmd = args.find(a => !a.startsWith("-")) || ""
  const s   = stripAnsi(stdout)

  if (cmd === "balance")  return parseBalance(s)

  if (cmd === "oracle") {
    const priceM = s.match(/BTC\/USD\s*:\s*\$?([\d.,]+)/i)
    const sigsM  = s.match(/Oracles\s*:\s*(\d+)/i)
    return {
      btcPrice:  priceM ? parseFloat(priceM[1].replace(/,/g, "")) : null,
      validSigs: sigsM  ? parseInt(sigsM[1]) : null,
    }
  }

  if (cmd === "generate-address") {
    const lines = s.split("\n").map(l => l.trim()).filter(Boolean)
    const addr  = lines.find(l => l.startsWith("vusd:")) || lines[lines.length - 1] || ""
    return { address: addr }
  }

  if (cmd === "open-vault") {
    const idM = s.match(/vault[^:]*:[a-f0-9]+/)
    return { vaultId: idM ? idM[0] : "", success: s.includes("✅") }
  }

  if (cmd === "health") {
    const stM  = s.match(/State\s*:\s*(\w+)/i)
    const dtM  = s.match(/Debt\s*:\s*\$?([\d.]+)/i)
    const hlM  = s.match(/Health\s*[Rr]atio\s*:\s*([\d.]+)/i)
    const clM  = s.match(/Collateral\s*:\s*([\d,]+)\s*sats/i)
    return {
      state:      stM ? stM[1]                            : "Unknown",
      debt:       dtM ? parseFloat(dtM[1])                : 0,
      health:     hlM ? parseFloat(hlM[1])                : 0,
      collateral: clM ? parseInt(clM[1].replace(/,/g,"")) : 0,
    }
  }

  if (cmd === "keystore") {
    const verM = s.match(/Version\s*:\s*v?(\d+)/i)
    return {
      version:        verM ? parseInt(verM[1]) : null,
      hasQuantumKeys: /hasQuantumKeys\s*:\s*true/i.test(s),
      output:         s.trim(),
    }
  }

  return { success: s.includes("✅"), output: s.trim() }
}

function normaliseVaults(data) {
  if (!data || typeof data !== "object") return []
  const entries = Array.isArray(data) ? data.map(v => [v.id, v]) : Object.entries(data)
  return entries.map(([id, v]) => {
    const debtRaw = v.debt_vusd ?? v.debt ?? 0
    return {
      id,
      state:           v.state === "Active" ? "Open" : (v.state || "Unknown"),
      collateralSats:  v.locked_btc         ?? v.collateralSats ?? 0,
      debt:            typeof debtRaw === "number" && debtRaw > 1e15 ? debtRaw / 1e18 : debtRaw,
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
      fundingTxid:     v.funding_txid       ?? null,
    }
  })
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/** POST /vusd — execute any vusd CLI command */
app.post("/vusd", (req, res) => {
  const { args } = req.body || {}
  if (!Array.isArray(args)) return res.status(400).json({ error: "args must be an array" })
  try {
    const stdout = runVusd(args)
    res.json(parseCliOutput(stdout, args))
  } catch(e) {
    console.error("[/vusd]", args.join(" "), "→", e.message)
    res.status(500).json({ error: e.message, output: e.stderr || "" })
  }
})

/**
 * GET /balance — combined BTC sats (RPC) + VUSD balance + BTC price (CLI).
 * Single call that mirrors Electron's Promise.all([btcBalance, vusdBalance]).
 */
app.get("/balance", async (req, res) => {
  let btcSats   = 0
  let vusdBalance = 0
  let btcPrice  = null
  let outputs   = 0

  // BTC sats via HTTP JSON-RPC (platform-independent)
  try {
    const btcBal = await btcRpc("getbalance")
    if (typeof btcBal === "number") btcSats = Math.round(btcBal * 1e8)
  } catch { /* bitcoind offline */ }

  // VUSD balance from wallet.json (accurate — CLI shows $0 due to ringct state)
  try {
    const w = readWalletJson()
    vusdBalance = w.balance
    outputs     = w.outputs
  } catch { /* wallet.json unavailable */ }

  // BTC price from oracle CLI
  try {
    const stdout = runVusd(["--signet", "oracle"])
    const m = stripAnsi(stdout).match(/BTC\/USD\s*:\s*\$?([\d.,]+)/i)
    if (m) btcPrice = parseFloat(m[1].replace(/,/g, ""))
  } catch { /* vusd not running */ }

  res.json({ btcSats, vusdBalance, btcPrice, outputs })
})

/** GET /vaults — read and normalise ~/.vusd/vaults.json */
app.get("/vaults", (req, res) => {
  try {
    const vaultsFile = IS_WIN
      ? path.join(os.homedir(), ".vusd", "vaults.json")   // Windows home (usually WSL home isn't here)
      : path.join(HOME, ".vusd", "vaults.json")
    const raw  = fs.readFileSync(vaultsFile, "utf8")
    res.json(normaliseVaults(JSON.parse(raw)))
  } catch {
    // Fallback: read via wsl.exe on Windows
    if (IS_WIN) {
      try {
        const r = spawnSync("wsl.exe", ["-e", "cat", "/home/s6d/.vusd/vaults.json"],
          { timeout: 10000, encoding: "utf8" })
        if (r.status === 0) return res.json(normaliseVaults(JSON.parse(r.stdout)))
      } catch { /* ignore */ }
    }
    res.json([])
  }
})

/** GET /wallet — VUSD wallet info read directly from wallet.json */
app.get("/wallet", (req, res) => {
  try {
    const { balance, outputs } = readWalletJson()
    res.json({ balance, outputs, history: [] })
  } catch {
    res.json({ balance: 0, outputs: 0, history: [] })
  }
})

/** GET /btc-address — return existing or generate new bitcoin address */
app.get("/btc-address", async (req, res) => {
  try {
    const addrs    = await btcRpc("getaddressesbylabel", [""])
    const existing = Object.keys(addrs || {}).find(a => a.startsWith("tb1") || a.startsWith("bc1"))
    if (existing) return res.json({ address: existing })
    const addr = await btcRpc("getnewaddress", [])
    res.json({ address: addr || "" })
  } catch(e) {
    res.json({ address: "", error: e.message })
  }
})

/** POST /btc-new-address — generate a fresh one-time deposit address */
app.post("/btc-new-address", async (req, res) => {
  try {
    const addr = await btcRpc("getnewaddress", ["one-time"])
    res.json({ address: addr || "" })
  } catch(e) {
    res.json({ address: "", error: e.message })
  }
})

/** GET /transactions — last 20 bitcoin transactions */
app.get("/transactions", async (req, res) => {
  try {
    const txs = await btcRpc("listtransactions", ["*", 20])
    res.json(txs.reverse().map(tx => ({
      txid:          tx.txid,
      category:      tx.category,
      amount:        tx.amount,
      fee:           tx.fee || 0,
      confirmations: tx.confirmations,
      time:          tx.time,
      address:       tx.address,
    })))
  } catch(e) {
    res.json([])
  }
})

/** POST /faucet — send testnet BTC to address */
app.post("/faucet", async (req, res) => {
  const { address } = req.body || {}
  if (!address) return res.status(400).json({ error: "address required" })
  try {
    const txid = await btcRpc("sendtoaddress", [address, 0.0001])
    res.json({ success: true, txid })
  } catch(e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/** GET /node-info — block height and peer count */
app.get("/node-info", async (req, res) => {
  try {
    const [blocks, peers] = await Promise.allSettled([
      btcRpc("getblockcount", [], ""),
      btcRpc("getpeerinfo",   [], ""),
    ])
    res.json({
      blockcount: blocks.status === "fulfilled" ? blocks.value : null,
      peers:      peers.status  === "fulfilled" ? (Array.isArray(peers.value) ? peers.value.length : 0) : 0,
    })
  } catch {
    res.json({ blockcount: null, peers: 0 })
  }
})

/** GET /network-status — structured status for Settings page */
app.get("/network-status", async (req, res) => {
  let bitcoindConnected = false
  let lndConnected      = false
  let blockHeight       = null

  try {
    const count = await btcRpc("getblockcount", [], "")
    if (typeof count === "number") { bitcoindConnected = true; blockHeight = count }
  } catch { /* offline */ }

  if (!IS_WIN) {
    try {
      execSync("lncli --network=signet getinfo", { env: ENV, timeout: 5000 })
      lndConnected = true
    } catch { /* offline */ }
  }

  res.json({ bitcoindConnected, lndConnected, blockHeight, syncProgress: bitcoindConnected ? 100 : null })
})

/** GET /health — server liveness probe */
app.get("/health", (req, res) => {
  res.json({ ok: true, platform: process.platform, bin: VUSD_WSL_BIN, data: VUSD_DATA })
})

// ── Start ──────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001", 10)
app.listen(PORT, () => {
  console.log(`VUSD API server  http://localhost:${PORT}`)
  console.log(`  Platform : ${process.platform} (${IS_WIN ? "WSL passthrough" : "direct exec"})`)
  console.log(`  Binary   : ${VUSD_WSL_BIN}`)
  console.log(`  Data     : ${VUSD_DATA}`)
  console.log(`  RPC      : localhost:${RPC_PORT}`)
})
