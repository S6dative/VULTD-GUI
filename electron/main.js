const { app, BrowserWindow, ipcMain } = require("electron")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")

const IS_WIN = process.platform === "win32"
const WSL = "C:\Windows\System32\wsl.exe"
const BCLI = IS_WIN ? WSL : "bitcoin-cli"
const VUSD_BIN = IS_WIN ? WSL : path.join(app.getAppPath(), "..", "vusd")
const VUSD_WSL = "/mnt/c/Users/AK111/Downloads/vusd-protocol-v34/vusd-protocol/target/release/vusd"
const VAULTS_WIN = "\\\\wsl$\\Ubuntu\\home\\s6d\\.vusd\\vaults.json"
const VAULTS_PATH = IS_WIN ? VAULTS_WIN : path.join(os.homedir(), ".vusd", "vaults.json")
const SARGS = IS_WIN ? ["bitcoin-cli","-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const SARGS_W = IS_WIN ? ["bitcoin-cli","-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"] : ["-signet","-rpcwallet=vusd","-rpcuser=vusd","-rpcpassword=vusd_rpc_password","-rpcport=38332"]
const VENV = { VUSD_OWNER_SEED_HEX:"8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038", VUSD_SIGNING_KEY_HEX:"855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e" }

function run(bin, args, env={}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { env: { ...process.env, ...env } })
    let out="", err=""
    proc.stdout.on("data", d => out += d)
    proc.stderr.on("data", d => err += d)
    proc.on("close", code => {
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

ipcMain.handle("vusd", async (_,args) => run(VUSD_BIN, IS_WIN?[VUSD_WSL,...args]:args, VENV))
ipcMain.handle("bitcoin-cli", async (_,args) => run(BCLI,[...SARGS,...args]))
ipcMain.handle("faucet", async (_,addr) => run(BCLI,[...SARGS_W,"sendtoaddress",addr,(10000/1e8).toFixed(8)]))
ipcMain.handle("btc-balance", async () => run(BCLI,[...SARGS_W,"getbalance"]))
ipcMain.handle("btc-address", async () => run(BCLI,[...SARGS_W,"getnewaddress"]))
ipcMain.handle("read-vaults", async () => { try { return JSON.parse(fs.readFileSync(VAULTS_PATH,"utf8")) } catch { return {} } })
ipcMain.handle("vusd-balance-parsed", async () => { const r=await run(VUSD_BIN,IS_WIN?[VUSD_WSL,"balance"]:["balance"],VENV); return parseVusd(r.output||"") })
ipcMain.handle("vusd-oracle-parsed", async () => { const r=await run(VUSD_BIN,IS_WIN?[VUSD_WSL,"oracle"]:["oracle"],VENV); return parseVusd(r.output||"") })
ipcMain.handle("node-info", async () => {
  const [b,pp] = await Promise.allSettled([run(BCLI,[...SARGS,"getblockcount"]),run(BCLI,[...SARGS,"getpeerinfo"])])
  return { blockcount: b.status==="fulfilled"?b.value:null, peers: pp.status==="fulfilled"?(Array.isArray(pp.value)?pp.value.length:0):0 }
})

app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
