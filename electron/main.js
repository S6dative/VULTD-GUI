const { app, BrowserWindow, ipcMain } = require("electron")
const { spawn, execFileSync } = require("child_process")
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
const VENV = { VUSD_OWNER_SEED_HEX:"8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038", VUSD_SIGNING_KEY_HEX:"855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e" }
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
    const timeout = setTimeout(() => { proc.kill(); console.error("TIMEOUT:", bin, args.join(" ")); reject(new Error("timeout")) }, 8000)
    let out="", err=""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(err.trim() || "exit "+code))
      const t = out.trim()
      try { resolve(JSON.parse(t)) } catch { const n=parseFloat(t); if(!isNaN(n)) resolve(n); else resolve({output:t}) }
    })
  })
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
  try { return await btcRpc("getbalance", [], "vusd") } catch(e) { return 0 }
})

ipcMain.handle("btc-address", async () => {
  try {
    // Return existing address if one exists, otherwise generate new
    const addrs = await btcRpc("getaddressesbylabel", [""], "vusd")
    const existing = Object.keys(addrs || {}).find(a => a.startsWith('tb1') || a.startsWith('bc1'))
    if (existing) return existing
    return await btcRpc("getnewaddress", [], "vusd")
  } catch(e) { return "" }
})

ipcMain.handle("bitcoin-cli", async (_, args) => {
  try { return await btcRpc(args[0], args.slice(1), "vusd") } catch(e) { console.error("bitcoin-cli:", e.message); return { error: e.message } }
})

ipcMain.handle("read-vaults", async () => {
  try {
    const bin = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    // Read vault ids from vaults.json, then get health for each
    let vaultData = {}
    try {
      let rawV
      if (IS_WIN) {
        const rv = await run("wsl.exe", ["-e", VUSD_WSL, "cat-vaults"], {})
        // run() parses JSON automatically - rv IS the vault object
        if (typeof rv === "object" && rv !== null && !rv.output) {
          vaultData = rv
        } else {
          rawV = rv.output || ""
        }
      } else {
        rawV = fs.readFileSync(VAULTS_PATH, "utf8")
      }
      if (!Object.keys(vaultData).length && rawV) {
        vaultData = JSON.parse(rawV)
      }
    } catch(fe) { console.error("read-vaults file:", fe.message) }
    // For each vault, get health via CLI
    const result = {}
    for (const [id, v] of Object.entries(vaultData)) {
      try {
        const args = IS_WIN ? ["-e", VUSD_WSL, "health", "--vault", id] : ["health", "--vault", id]
        const r = await run(bin, args, IS_WIN ? {} : VENV)
        const text = r.output || ""
        const stateMatch = text.match(/State:\s*(\w+)/)
        const lockedMatch = text.match(/Locked:\s*([\d]+)\s*sats/)
        const debtMatch = text.match(/Debt:\s*([\d.]+)/)
        const crMatch = text.match(/CR:\s*([\d.]+)%/)
        result[id] = {
          ...v,
          state: stateMatch ? stateMatch[1].charAt(0)+stateMatch[1].slice(1).toLowerCase() : v.state,
          locked_btc: lockedMatch ? parseInt(lockedMatch[1]) : v.locked_btc,
          debt_vusd: debtMatch ? parseFloat(debtMatch[1]) : (v.debt_vusd > 1000 ? v.debt_vusd/1e18 : v.debt_vusd),
          health_cr: crMatch ? parseFloat(crMatch[1]) : null,
        }
      } catch {
        result[id] = { ...v, debt_vusd: v.debt_vusd > 1000 ? v.debt_vusd/1e18 : v.debt_vusd }
      }
    }
    return result
  } catch(e) { console.error("read-vaults:", e.message); return {} }
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
    return parseVusd(r.output || "")
  } catch(e) { return {} }
})

ipcMain.handle("vusd-oracle-parsed", async () => {
  try {
    const bin = IS_WIN ? "wsl.exe" : path.join(app.getAppPath(), "..", "vusd")
    const args = IS_WIN ? ["-e", VUSD_WSL, "oracle"] : ["oracle"]
    const r = await run(bin, args, IS_WIN ? {} : VENV)
    return parseVusd(r.output || "")
  } catch(e) { return {} }
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
  } catch(e) { return [] }
})

ipcMain.handle("faucet", async (_, address) => {
  try { return await btcRpc("sendtoaddress", [address, 0.0001], "vusd") } catch(e) { return { error: e.message } }
})

if (IS_WIN) app.commandLine.appendSwitch("no-sandbox")
app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
