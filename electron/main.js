const { app, BrowserWindow, ipcMain, session } = require("electron")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")
const http = require("http")

const IS_WIN = process.platform === "win32"
const VUSD_WSL = "/home/s6d/.vusd/run_vusd.sh"
let currentNetwork = 'signet'
const getRpcPort = () => currentNetwork === 'mainnet' ? 8332 : 38332
const getRpcUser = () => currentNetwork === 'mainnet' ? 'bitcoin' : 'vusd'
const getRpcPass = () => currentNetwork === 'mainnet' ? 'bitcoin' : 'vusd_rpc_password'
// Keys loaded from process env or OS keychain — never hardcoded
const VENV = {
  ...(process.env.VUSD_OWNER_SEED_HEX  ? { VUSD_OWNER_SEED_HEX:  process.env.VUSD_OWNER_SEED_HEX  } : {}),
  ...(process.env.VUSD_SIGNING_KEY_HEX ? { VUSD_SIGNING_KEY_HEX: process.env.VUSD_SIGNING_KEY_HEX } : {}),
  ...(process.env.VUSD_CHANGE_ADDRESS  ? { VUSD_CHANGE_ADDRESS:  process.env.VUSD_CHANGE_ADDRESS  } : {}),
}
const VAULTS_PATH = path.join(os.homedir(), ".vusd", "vaults.json")
const WALLET_PATH = path.join(os.homedir(), ".vusd", "wallet.json")

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

function btcRpc(method, params=[], wallet="") {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc:"1.0", id:"vultd", method, params })
    const walletPath = wallet ? "/wallet/"+wallet : "/"
    const opts = {
      hostname:"127.0.0.1", port:getRpcPort(), path:walletPath, method:"POST",
      headers:{ "Content-Type":"application/json", "Content-Length":Buffer.byteLength(body),
        "Authorization":"Basic "+Buffer.from(getRpcUser()+":"+getRpcPass()).toString("base64") }
    }
    const req = http.request(opts, res => {
      let data = ""
      res.on("data", d => data += d)
      res.on("end", () => {
        try { const r = JSON.parse(data); if (r.error) return reject(new Error(r.error.message)); resolve(r.result) }
        catch(e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("RPC timeout")) })
    req.write(body); req.end()
  })
}

function run(bin, args, env={}) {
  return new Promise((resolve, reject) => {
    const spawnEnv = { ...process.env, ...env }
    const proc = spawn(bin, args, { env: spawnEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    const timeout = setTimeout(() => { proc.kill(); console.error("TIMEOUT:", bin, args.join(" ")); reject(new Error("timeout")) }, 60000)
    let out="", err=""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(err.trim() || "exit "+code))
      const t = out.trim()
      const tc = t.replace(/\x1B\[[0-9;]*[mGKHF]/g,'').replace(/\[\d+[mGKH]/g,''); try { resolve(JSON.parse(tc)) } catch { const n=parseFloat(tc); if(!isNaN(n)) resolve(n); else resolve({output:tc}) }
    })
  })
}

function stripAnsi(str) {
  return (str || '').replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\[\d+m/g, '')
}

function parseVusd(text) {
  const r = {}
  for (const line of (text||"").split("\n")) {
    const m = line.match(/^\s+([^:]+?)\s*:\s*\$?([\d.,]+)/)
    if (m) r[m[1].trim().toLowerCase().replace(/\s+/g,"_")] = parseFloat(m[2].replace(/,/g,""))
  }
  return r
}

function createWindow() {
  const win = new BrowserWindow({
    width:1100, height:720, minWidth:900, minHeight:600,
    titleBarStyle:"hiddenInset", backgroundColor:"#0a0a0a",
    webPreferences:{ preload:path.join(__dirname,"preload.js"), contextIsolation:true, nodeIntegration:false }
  })

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "connect-src 'self' https://api.coingecko.com https://api.coinbase.com http://127.0.0.1:* http://localhost:*; " +
          "img-src 'self' data:;"
        ]
      }
    })
  })

  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else win.loadFile(path.join(__dirname,"../dist/index.html"))
}

ipcMain.handle("vusd", async (_,args) => {
  const bin = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
  const wslArgs = IS_WIN ? ["-e", VUSD_WSL, ...args] : args
  return run(bin, wslArgs, IS_WIN ? {} : VENV)
})

ipcMain.handle("set-network", (_, network) => {
  currentNetwork = network
  return { network: currentNetwork, port: getRpcPort() }
})

ipcMain.handle("btc-balance", async () => {
  try { return await btcRpc("getbalance", [], "vusd") } catch { return 0 }
})

ipcMain.handle("btc-new-address", async () => {
  try { return await btcRpc("getnewaddress", ["one-time"], "vusd") } catch { return "" }
})

ipcMain.handle("btc-address", async () => {
  try {
    // Return existing address if one exists, otherwise generate new
    const addrs = await btcRpc("getaddressesbylabel", [""], "vusd")
    const existing = Object.keys(addrs || {}).find(a => a.startsWith('tb1') || a.startsWith('bc1'))
    if (existing) return existing
    return await btcRpc("getnewaddress", [], "vusd")
  } catch { return "" }
})

ipcMain.handle("bitcoin-cli", async (_, args) => {
  try { return await btcRpc(args[0], args.slice(1), "vusd") } catch(e) { console.error("bitcoin-cli:", e.message); return { error: e.message } }
})

ipcMain.handle("read-vaults", async () => {
  try {
    let vaultData = {}
    if (IS_WIN) {
      try {
        const rv = await run("wsl.exe", ["-e", VUSD_WSL, "cat-vaults"], {})
        // run() parses JSON automatically — rv IS the vault object
        if (typeof rv === "object" && rv !== null && !rv.output) {
          vaultData = rv
        } else if (rv && rv.output) {
          try { vaultData = JSON.parse(rv.output) } catch { /* ignore parse error */ }
        }
      } catch(fe) { console.error("read-vaults cat-vaults:", fe.message) }
    } else {
      try { vaultData = JSON.parse(fs.readFileSync(VAULTS_PATH, "utf8")) } catch(fe) { console.error("read-vaults file:", fe.message) }
    }
    // Return cat-vaults data directly — no per-vault health calls.
    // health --vault takes 8-12s (oracle query) and always timed out in the GUI.
    // Health data is fetched on-demand via the vusd IPC handler when needed.
    const result = {}
    for (const [id, v] of Object.entries(vaultData)) {
      result[id] = {
        ...v,
        debt_vusd: typeof v.debt_vusd === "number" && v.debt_vusd > 1e15
          ? v.debt_vusd / 1e18
          : (v.debt_vusd || 0),
      }
    }
    return result
  } catch(e) { console.error("read-vaults:", e.message); return {} }
})

ipcMain.handle("read-vaults-raw", async () => {
  try {
    if (IS_WIN) {
      return await readWslFile("/home/s6d/.vusd/vaults.json")
    }
    return fs.readFileSync(VAULTS_PATH, "utf8")
  } catch(e) { console.error("read-vaults-raw:", e.message); return "{}" }
})

ipcMain.handle("read-wallet", async () => {
  try {
    if (IS_WIN) {
      const r = await run("wsl.exe", ["-e", VUSD_WSL, "cat-wallet"], {})
      // r is parsed JSON: {balance, outputs}
      if (r && typeof r === "object" && r.balance !== undefined) {
        return { balance: r.balance, outputs: r.outputs || 0, history: [] }
      }
    }
    // Linux fallback
    const bin = path.join(app.getAppPath(), "..", "vusd")
    const r = await run(bin, ["balance"], VENV)
    const text = (r.output || "").replace(/\[[0-9;]*[mGKH]/g, "")
    const balMatch = text.match(/VUSD balance\s*:\s*\$?([\d.,]+)/)
    const outMatch = text.match(/Outputs held\s*:\s*(\d+)/)
    return { balance: balMatch ? parseFloat(balMatch[1].replace(/,/g,"")) : 0, outputs: outMatch ? parseInt(outMatch[1]) : 0, history: [] }
  } catch(e) { console.error("read-wallet:", e.message); return { balance: 0, outputs: 0, history: [] } }
})

ipcMain.handle("vusd-balance-parsed", async () => {
  try {
    const bin = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    const args = IS_WIN ? ["-e", VUSD_WSL, "balance"] : ["balance"]
    const r = await run(bin, args, IS_WIN ? {} : VENV)
    return parseVusd(stripAnsi(r.output || ""))
  } catch { return {} }
})

ipcMain.handle("vusd-oracle-parsed", async () => {
  try {
    const bin = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    const args = IS_WIN ? ["-e", VUSD_WSL, "oracle"] : ["oracle"]
    const r = await run(bin, args, IS_WIN ? {} : VENV)
    return parseVusd(stripAnsi(r.output || ""))
  } catch { return {} }
})

ipcMain.handle("node-info", async () => {
  try {
    const [blocks, peers] = await Promise.allSettled([btcRpc("getblockcount"), btcRpc("getpeerinfo")])
    return {
      blockcount: blocks.status==="fulfilled" ? blocks.value : null,
      peers: peers.status==="fulfilled" ? (Array.isArray(peers.value) ? peers.value.length : 0) : 0
    }
  } catch { return { blockcount: null, peers: 0 } }
})

ipcMain.handle("list-transactions", async () => {
  try {
    const txs = await btcRpc("listtransactions", ["*", 20], "vusd")
    return txs.reverse().map(tx => ({
      txid: tx.txid,
      category: tx.category,
      amount: tx.amount,
      fee: tx.fee || 0,
      confirmations: tx.confirmations,
      time: tx.time,
      address: tx.address,
    }))
  } catch { return [] }
})

ipcMain.handle("faucet", async (_, address) => {
  try { return await btcRpc("sendtoaddress", [address, 0.0001], "vusd") } catch(e) { return { error: e.message } }
})

if (IS_WIN) app.commandLine.appendSwitch("no-sandbox")
app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
