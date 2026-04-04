const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    }
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function run(bin, args, env={}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { env: { ...process.env, ...env } })
    let out='', err=''
    proc.stdout.on('data', d => out += d)
    proc.stderr.on('data', d => err += d)
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(err.trim() || 'exit '+code))
      try { resolve(JSON.parse(out)) } catch { resolve({ output: out.trim() }) }
    })
  })
}
const BCLI = 'bitcoin-cli'
const VUSD_BIN = path.join(app.getAppPath(), '..', 'vusd')
const SARGS = ['-signet','-rpcuser=vusd','-rpcpassword=vusd_rpc_password','-rpcport=38332']
const SARGS_WALLET = [...SARGS, '-rpcwallet=vusd']
const VENV = { VUSD_OWNER_SEED_HEX:'8f5c50385bab6671b1d856212066ec8195cbb51ba5c64f5b42d4da82b9478038', VUSD_SIGNING_KEY_HEX:'855a8421c4df8125ea2efb6da37966b8fa5712a0880124cbd724e54a87453f5e' }
ipcMain.handle('vusd', async (_, args) => run(VUSD_BIN, args, VENV))
ipcMain.handle('bitcoin-cli', async (_, args) => run(BCLI, [...SARGS, ...args]))
ipcMain.handle('faucet', async (_, address) => run(BCLI, [...SARGS_WALLET, 'sendtoaddress', address, (10000/100000000).toFixed(8)]))
ipcMain.handle('btc-balance', async () => run(BCLI, [...SARGS_WALLET, 'getbalance']))
ipcMain.handle('btc-address', async () => run(BCLI, [...SARGS_WALLET, 'getnewaddress']))


// read vaults.json directly
ipcMain.handle('read-vaults', async () => {
  const p = path.join(os.homedir(), '.vusd', 'vaults.json')
  try {
    const raw = fs.readFileSync(p, 'utf8')
    return JSON.parse(raw)
  } catch { return [] }
})

// read vusd balance from balance command output
ipcMain.handle('vusd-balance', async () => run(VUSD_BIN, ['balance'], VENV))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
