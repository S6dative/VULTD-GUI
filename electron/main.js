const { app, BrowserWindow, ipcMain } = require('electron')
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

ipcMain.handle('vusd', async (_, args) => {
  return new Promise((resolve, reject) => {
    const vusdBin = path.join(app.getAppPath(), '..', 'vusd')
    const proc = spawn(vusdBin, ['--signet', ...args], { env: { ...process.env } })
    let out = '', err = ''
    proc.stdout.on('data', d => out += d)
    proc.stderr.on('data', d => err += d)
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(err || `exit ${code}`))
      try { resolve(JSON.parse(out)) } catch { resolve({ output: out.trim() }) }
    })
  })
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
