const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require('fs')
const ospath = require('path')
const conf = require('./config')
const conn = require('./connection')
const async = require('async')
const ni3 = require('node-id3')

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
  'folders':{},//blocked
  'unblockedFolders':{}//unblocked <- where songs are taken from, added on app start up if not present
}
)

const readline = require('readline')

const SHUFFLE_ITERATIONS = 2

let win = null
let connection = null
let config = null
let messages = []

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

class Song {

    constructor(path, ownerDir=null, artist=null, depth=1) {
        this.path = path
        this.ownerDir = ownerDir
        this.artist = artist
        this.depth = depth
    }
}

function randint(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

let ep1 = false
let ep2 = false

function exportPlaylist() {

    ep1 = false
    ep2 = false
    let msgs = []
    let k = 1

    // let startTime = process.hrtime()
    // const bm = ()=>{
    //     let curTime = process.hrtime(startTime)
    //     return curTime
    // }
    // const benchMark = (lab = '')=>
    // {
    //     let tt = bm()
    //     if(lab === '') {
    //         lab = k
    //     }
    //     msgs.push('Checkpoint ' + lab + ' - ' + tt[0] + 's ' + (tt[1]/1000000) +  'ms ellapsed')
    //     k++
    // }

    if(config['extractionPaths'].length === 0) {
        msgs.push('No source folders to export from.')
        return msgs
    }

    let [songs, totals] = connection.getPreSongs(config)

    let i = 0

    // console.log(appdata.connection.filterSongsByFolder)
    // console.log(appdata.connection)

    //benchMark()

    // for(let folder of songs) {
    //     if(songs.length > 0 && !hasSongs) {
    //         hasSongs = true
    //     }
    //     if(appdata.config['extractionPaths'][i].count > 0 && !setSongs) {
    //         setSongs = true
    //     }
    //     songs[i] = appdata.connection.songs//.filterSongsByFolder(appdata.config['extractionPaths'][i].path, folder)
    //     i++
    // }

    if(songs.length === 0) {
        msgs.push('No songs left, please add more')
        return msgs
    }

    //benchMark()


    let potentialPlaylists = []
    for(let g = 0; g < SHUFFLE_ITERATIONS; g++) {
        potentialPlaylists.push(generatePlaylist(songs, config))
    }

    let playlist = potentialPlaylists.sort(
        (a, b) => (a.length > b.length) ? 1 : -1
    )[0]
    //msgs.push('Playlist length: ' + playlist.length)

    if(playlist.length === 0) {
        msgs.push('There are no more songs left, please add more or reset the app')
        return msgs
    }

    // benchMark()

    let target = config['destinationPath']
    for(let item of fs.readdirSync(target)) {
        let ext = ospath.extname(item)
        let base = ospath.basename(item)

        if(ext === '.mp3' && base.includes('__SFL__')) {
            fs.unlinkSync(ospath.join(target, base))
        }
    }
    // benchMark()


    let finishedCopies = 0
    let totalCopies = playlist.length

    //benchMark()

    let actions = []
    for(let song of playlist) {
        let base = ospath.basename(song.path)

        //fs.copyFileSync(song.path, ospath.join(target, '__SFL__' + base))
        // fs.copyFile(song.path, ospath.join(target, '__SFL__' + base), (e) => {}
        // )
        actions.push(function(callback) {
          fs.copyFile(song.path, ospath.join(target, '__SFL__' + base), (e) => {
            finishedCopies++
            if(finishedCopies >= totalCopies) {
             // benchMark('file transfer')
              console.log('Finished copies... ' + totalCopies)
            }
          })
        })
        connection.blockSong(song)
    }

    async.parallel(
      actions,
      function(err, res) {
        ep2 = true
        if(ep1) {
          refr()
        }
      }
    )
    // benchMark()
    connection.save()

    // benchMark()

    i = 0
    for(let pathObj of config['extractionPaths']) {

        let minNum = parseInt(pathObj.count)

        let left = connection.root.unblockedFolders[pathObj.path].songs.length

        if(left <= minNum) {
            msgs.push('There are ' + left + ' unblocked songs left in the folder ' + pathObj.path + '. Please add more songs or reset the app.')
        }

        // benchMark()

        i++
    }

    //benchMark('COUNTS')

    msgs.push('Exported')

    config['exportsSinceReset']++

    if(ep2) {
      refr()
    }
    ep1 = true

    messages = msgs
}

function generatePlaylist(songs) {

    if(songs.length === 0) {
        return []
    }
    let songsCopy = []
    for(let sub of songs) {
        songsCopy.push(sub.slice())
    }

    let playlist = []

    let artistCounts = {}

    let maxPer = parseInt(config['maxPerArtist'])

    let i = 0

    for (let pathObj of config['extractionPaths']) {

        let folder = songsCopy[i]

        let count = parseInt(pathObj['count'])

        let selectedSongs = []

        while(selectedSongs.length < count && folder.length > 0) {

            let selectedIndex = randint(folder.length)

            let song = folder[selectedIndex]

            let artist = ni3.read(song.path).artist

            if(artist === undefined || artist === null || artist === '') {
                artist = ''
            }

            if (artist !== '') {

                if(artist in artistCounts) {
                    if(artistCounts[artist] < maxPer) {
                        artistCounts[artist] += 1
                    }
                    else {
                        folder.splice(selectedIndex, 1)
                        continue
                    }
                }
                else {
                    artistCounts[artist] = 1
                }
            }

            selectedSongs.push(song)
            folder.splice(selectedIndex, 1)
        }

        if(selectedSongs.length > 0) {
            playlist = playlist.concat(selectedSongs)
        }

        i++
    }

    return playlist
}




//////////////

ipcMain.on('removeSourceFolder', function removeSourceFolder(e, i) {
    let modPathObjs = [].concat(config['extractionPaths'])

    let p = modPathObjs[i]
    modPathObjs.splice(i, 1)
    config['extractionPaths'] = modPathObjs
    config = conf.saveConfig(config)
    connection.updateJSONRemoved(p, config)
    connection.updateSongs(config)
    refr()
})

ipcMain.on('saveSettings', function saveSettings(e, elements) {
    let val = elements['max-per-artist-input']

    //document.getElementById('max-per-artist-input').value
    if(isNaN(val)) {
        config['maxPerArtist'] = parseInt(0)
    }
    else {
        config['maxPerArtist'] = parseInt(val)
    }

    let i = 0
    for(let folder of config['extractionPaths']) {

        config['extractionPaths'][i].count = elements['source-folder-quantity'][i]
        config['extractionPaths'][i].depth = elements['source-folder-depth'][i]
        i++
    }

    config = conf.saveConfig(config)
    connection.updateSongs(config)
    //addMessage('Settings saved.')
    messages.push('Changes Saved.')
    refr()
})

ipcMain.on('addSourceFolder',function addSourceFolder(e, m) {
    let data = dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if(data != null) {

        let pathObjs = []

        let newPathObj = {'path':data[0],'count':0, 'depth':1}

        if(config['extractionPaths'].length > 0) {
            pathObjs = pathObjs.concat(config['extractionPaths'])
        }

        pathObjs.push(newPathObj)

        config['extractionPaths'] = pathObjs

        config = conf.saveConfig(config)
        connection.updateJSONAdded(data[0], config)
        connection.updateSongs(config)
        refr()
    }
})

ipcMain.on('targetChange', function targetChange(e, m) {
    let data = dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if(data != null) {

        config['destinationPath'] = data[0]

        config = conf.saveConfig(config)

        refr()
    }
})

ipcMain.on('rreset',function reset(e, m) {
    config['exportsSinceReset'] = 0
    config = conf.saveConfig(config)
    //addMessage('Reset.')
    connection.reset()
    connection.updateSongs(config)
    messages.push('Reset.')
    refr()
})

ipcMain.on('shuffle', function shuffle(e, m) {

    let msgs = exportPlaylist()

    if(msgs !== undefined && msgs.length !== 0) {
      messages.push(...msgs)
    }

    config = conf.saveConfig(config)

    // for(let msg of msgs) {
    //     log(msg)
    // }

    refr()
})

if(!fs.existsSync(conf.PROJ_DIR))
{
  fs.mkdirSync(conf.PROJ_DIR)
  fs.writeFileSync(ospath.join(conf.PROJ_DIR, 'config.json'), DEFAULT_CONFIG)
  fs.writeFileSync(ospath.join(conf.PROJ_DIR, 'sample.json'), '{"folders":{},"unblockedFolders":{}}')
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

  config = conf.authenticateConfig(JSON.parse(fs.readFileSync(ospath.join(conf.PROJ_DIR, 'config.json'))))
  connection = new conn.BlockedConnection(conf.PROJ_DIR),

  win.appdata = {
    'config':config,
    'messages':[]
  }


  // win.appdata.connection.updateSongs(win.appdata.config)
  connection.updateSongs(config)
  // win.appdata.connection.save()
  win.loadFile('index.html')
}

function refr() {
  win.appdata = {'config':config,'messages':messages}//data
  win.loadFile('index.html')
}

ipcMain.on('log', (e, msg)=>console.log(msg))

app.on('ready', createWindow)
