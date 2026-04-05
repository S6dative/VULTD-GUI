const { app, BrowserWindow, ipcMain } = require("electron")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")

const IS_WIN = process.platform === "win32"
const WSL = "wsl.exe"

// Direct Bitcoin RPC via HTTP - no WSL needed
const http = require("http")
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
        try {
          const r = JSON.parse(data)
          if (r.error) return reject(new Error(r.error.message))
          resolve(r.result)
        } catch(e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("RPC timeout")) })
    req.write(body)
    req.end()
  })
}
const BCLI = IS_WIN ? WSL : "bitcoin-cli"
const VUSD_BIN = IS_WIN ? WSL : path.join(app.getAppPath(), "..", "vusd")
const VUSD_WSL = "/home/s6d/.vusd/run_vusd.sh"
const VAULTS_WIN = "\\\\wsl$\\Ubuntu\\home\\s6d\\.vusd\\vaults.json"
const WALLET_WIN = "\\\\wsl$\\Ubuntu\\home\\s6d\\.vusd\\wallet.json"
const WALLET_PATH = IS_WIN ? WALLET_WIN : require("path").join(require("os").homedir(), ".vusd", "wallet.json")
const VAULTS_PATH = IS_WIN ? VAULTS_WIN : path.join(os.homedir(), ".vusd", "vaults.json")
const SARGS = IS_WIN ? ["-e","bitcoin-cli","-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const SARGS_W = IS_WIN ? ["-e","bitcoin-cli","-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const VENV = { VUSD_OWNER_SEED_HEX:"8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038", VUSD_SIGNING_KEY_HEX:"855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e" }

function run(bin, args, env={}) {
  return new Promise((resolve, reject) => {
    const spawnEnv = IS_WIN ? { ...process.env, ...env, PATH: process.env.PATH + ";C:\Windows\System32;C:\Windows\System32\WindowsApps" } : { ...process.env, ...env }
    const proc = spawn(bin, args, { env: spawnEnv, stdio: ["ignore", "pipe", "pipe"] })
    const timeout = setTimeout(() => { proc.kill(); reject(new Error("timeout: " + bin + " " + args[0])) }, 15000)
    let out="", err=""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(err.trim() || "exit "+code))
      const t = out.trim()
    })
  })
}

function parseVusd(text) {
  const r = {}
  for (const line of text.split("\n")) {
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

ipcMain.handle("vusd", async (_,args) => run(VUSD_BIN, IS_WIN?["-e",VUSD_WSL,...args]:args, IS_WIN?{}:VENV))
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")

const IS_WIN = process.platform === "win32"
const WSL = "wsl.exe"

// Direct Bitcoin RPC via HTTP - no WSL needed
const http = require("http")
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
        try {
          const r = JSON.parse(data)
          if (r.error) return reject(new Error(r.error.message))
          resolve(r.result)
        } catch(e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("RPC timeout")) })
    req.write(body)
    req.end()
  })
}
const BCLI = IS_WIN ? WSL : "bitcoin-cli"
const VUSD_BIN = IS_WIN ? WSL : path.join(app.getAppPath(), "..", "vusd")
const VUSD_WSL = "/home/s6d/.vusd/run_vusd.sh"
const VAULTS_WIN = "\\\\wsl$\\Ubuntu\\home\\s6d\\.vusd\\vaults.json"
const WALLET_WIN = "\\\\wsl$\\Ubuntu\\home\\s6d\\.vusd\\wallet.json"
const WALLET_PATH = IS_WIN ? WALLET_WIN : require("path").join(require("os").homedir(), ".vusd", "wallet.json")
const VAULTS_PATH = IS_WIN ? VAULTS_WIN : path.join(os.homedir(), ".vusd", "vaults.json")
const SARGS = IS_WIN ? ["-e","bitcoin-cli","-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const SARGS_W = IS_WIN ? ["-e","bitcoin-cli","-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const VENV = { VUSD_OWNER_SEED_HEX:"8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038", VUSD_SIGNING_KEY_HEX:"855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e" }

function run(bin, args, env={}) {
  return new Promise((resolve, reject) => {
    const spawnEnv = IS_WIN ? { ...process.env, ...env, PATH: process.env.PATH + ";C:\Windows\System32;C:\Windows\System32\WindowsApps" } : { ...process.env, ...env }
    const proc = spawn(bin, args, { env: spawnEnv, stdio: ["ignore", "pipe", "pipe"] })
    const timeout = setTimeout(() => { proc.kill(); reject(new Error("timeout: " + bin + " " + args[0])) }, 15000)
    let out="", err=""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(err.trim() || "exit "+code))
      const t = out.trim()
    })
  })
}

function parseVusd(text) {
  const r = {}
  for (const line of text.split("\n")) {
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
  if (IS_WIN) {
    const wslArgs = [
      "--env", "VUSD_OWNER_SEED_HEX=8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038",
      "--env", "VUSD_SIGNING_KEY_HEX=855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e",
      "-e", VUSD_WSL, ...args
    ]
    return run(VUSD_BIN, wslArgs, {})
  }
  return run(VUSD_BIN, args, VENV)
})
ipcMain.handle("bitcoin-cli", async (_,args) => run(BCLI,[...SARGS,...args]))
ipcMain.handle("faucet", async (_,addr) => run(BCLI,[...SARGS_W,"sendtoaddress",addr,(10000/1e8).toFixed(8)]))
ipcMain.handle("btc-balance", async () => { try { return await btcRpc("getbalance",[],"vusd") } catch(e) { console.error("btc-balance:",e.message); return 0 } })
ipcMain.handle("btc-address", async () => { try { return await btcRpc("getnewaddress",[],"vusd") } catch(e) { console.error("btc-address:",e.message); return "" } })
ipcMain.handle("read-vaults", async () => { try { return JSON.parse(fs.readFileSync(VAULTS_PATH,"utf8")) } catch { return {} } })
ipcMain.handle("read-wallet", async () => {
  try {
    const raw = fs.readFileSync(WALLET_PATH, "utf8")
    const outputs = JSON.parse(raw)
    const unspent = outputs.filter(o => !o.spent)
    const balance = unspent.reduce((sum, o) => sum + o.amount / 1e18, 0)
    const history = outputs.map(o => ({
      amount: o.amount / 1e18,
      spent: o.spent,
      received_at: o.received_at,
      output_index: o.output_index,
    })).sort((a,b) => b.received_at - a.received_at)
    return { balance: Math.round(balance * 100) / 100, outputs: unspent.length, history }
  } catch(e) { console.error("read-wallet:", e.message); return { balance: 0, outputs: 0, history: [] } }
})
ipcMain.handle("vusd-balance-parsed", async () => {
  try {
    const r = await run(VUSD_BIN, IS_WIN?["-e",VUSD_WSL,"balance"]:["balance"], IS_WIN?{}:VENV)
    console.log("vusd-balance raw:", r)
    const parsed = parseVusd(r.output||"")
    console.log("vusd-balance parsed:", parsed)
    return parsed
  } catch(e) {
    console.error("vusd-balance error:", e.message)
    return {}
  }
})
  const wslArgs3=IS_WIN?["-e",VUSD_WSL,"oracle"]:["oracle"]; const r=await run(VUSD_BIN,wslArgs3,IS_WIN?{}:VENV)
ipcMain.handle("node-info", async () => {
  try {
    const [blocks, peers] = await Promise.allSettled([btcRpc("getblockcount"), btcRpc("getpeerinfo")])
    return { blockcount: blocks.status==="fulfilled"?blocks.value:null, peers: peers.status==="fulfilled"?(Array.isArray(peers.value)?peers.value.length:0):0 }
  } catch(e) { return { blockcount: null, peers: 0 } }
})

app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
