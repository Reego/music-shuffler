const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const ospath = require('path')
const conf = require('./config')
const conn = require('./connection')

const DEFAULT_CONFIG = JSON.stringify(
  {
    'extractionPaths':[],
    'destinationPath':'/Users/Shared/MusicShuffler',
    'targetJSON':'sample.json',
    'maxPerArtist':1,
    'exportsSinceReset':0,
  }
)
const DEFAULT_BLOCKED = JSON.stringify(
{
  'folders':[]
}
)

let win = null

if(!fs.existsSync(conf.PROJ_DIR))
{
  fs.mkdirSync(conf.PROJ_DIR)
  fs.writeFileSync(ospath.join(conf.PROJ_DIR, 'config.json'), DEFAULT_CONFIG)
  fs.writeFileSync(ospath.join(conf.PROJ_DIR, 'sample.json'), '{"folders":[]}')
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.

  console.log(ospath.join(conf.PROJ_DIR, 'config.json'))

  win.appdata = {
    'config':conf.authenticateConfig(JSON.parse(fs.readFileSync(ospath.join(conf.PROJ_DIR, 'config.json')))),
    'connection':new conn.BlockedConnection(conf.PROJ_DIR),
    'messages':[]
  }
  win.loadFile('index.html')
}

ipcMain.on('log', (e, msg)=>console.log(msg))

ipcMain.on('refr', function(e, data) {
  data.connection = new conn.BlockedConnection(conf.PROJ_DIR)
  win.appdata = data
  win.loadFile('index.html')
})

app.on('ready', createWindow)
