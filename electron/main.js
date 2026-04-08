const { app, BrowserWindow, ipcMain } = require("electron")
const { spawn, execFileSync } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")
const http = require("http")

const IS_WIN = process.platform === "win32"
const VUSD_WSL = "/home/s6d/.vusd/run_vusd.sh"
const VENV = { VUSD_OWNER_SEED_HEX:"8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038", VUSD_SIGNING_KEY_HEX:"855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e" }
const VAULTS_PATH = path.join(os.homedir(), ".vusd", "vaults.json")
const WALLET_PATH = path.join(os.homedir(), ".vusd", "wallet.json")

function readWslFile(wslPath) {
  return execFileSync("wsl.exe", ["-e", "cat", wslPath], { encoding: "utf8", timeout: 5000, windowsHide: true })
}

function btcRpc(method, params=[], wallet="") {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc:"1.0", id:"vultd", method, params })
    const walletPath = wallet ? "/wallet/"+wallet : "/"
    const opts = {
      hostname:"127.0.0.1", port:38332, path:walletPath, method:"POST",
      headers:{ "Content-Type":"application/json", "Content-Length":Buffer.byteLength(body),
        "Authorization":"Basic "+Buffer.from("vusd:vusd_rpc_password").toString("base64") }
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
    const proc = spawn(bin, args, { env: spawnEnv, stdio: ["ignore", "pipe", "pipe"] })
    const timeout = setTimeout(() => { proc.kill(); reject(new Error("timeout")) }, 20000)
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

ipcMain.handle("btc-balance", async () => {
  try { return await btcRpc("getbalance", [], "vusd") } catch(e) { return 0 }
})

ipcMain.handle("btc-address", async () => {
  try { return await btcRpc("getnewaddress", [], "vusd") } catch(e) { return "" }
})

ipcMain.handle("bitcoin-cli", async (_, args) => {
  try { return await btcRpc(args[0], args.slice(1)) } catch(e) { return {} }
})

ipcMain.handle("read-vaults", async () => {
  try {
    const raw = IS_WIN ? readWslFile("/home/s6d/.vusd/vaults.json") : fs.readFileSync(VAULTS_PATH, "utf8")
    return JSON.parse(raw)
  } catch(e) { console.error("read-vaults:", e.message); return {} }
})

ipcMain.handle("read-wallet", async () => {
  try {
    const raw = IS_WIN ? readWslFile("/home/s6d/.vusd/wallet.json") : fs.readFileSync(WALLET_PATH, "utf8")
    const outputs = JSON.parse(raw)
    const unspent = outputs.filter(o => !o.spent)
    const balance = Math.round(unspent.reduce((s, o) => s + o.amount / 1e18, 0) * 100) / 100
    const history = [...outputs].sort((a,b) => b.received_at - a.received_at).map(o => ({
      amount: o.amount / 1e18, spent: o.spent, received_at: o.received_at
    }))
    return { balance, outputs: unspent.length, history }
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

ipcMain.handle("faucet", async (_, address) => {
  try { return await btcRpc("sendtoaddress", [address, 0.0001], "vusd") } catch(e) { return { error: e.message } }
})

if (IS_WIN) app.commandLine.appendSwitch("no-sandbox")
app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
