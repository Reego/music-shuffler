const { ipcRenderer, showMessageBox } = require('electron')
const fs = require('fs')
const ospath = require('path')
const { remote } = require('electron')
const conf = require('./config')
const shuffler = require('./shuffler')

var appdata = null

function appSetup() {

    appdata = remote.getCurrentWindow().appdata

    document.body.style.display = 'block'

    if(appdata.connection.songs.length === 0) {
        appdata.connection.getSongs(appdata.config)
    }

    let i = 0
    let sourcesParent = document.getElementById('source-folder-info')
    for(let pathObj of appdata.config['extractionPaths']) {
        let g = i
        let row = document.createElement('div')
        row.className = 'source-folder-row'

        let extractionPath = document.createElement('div')
        extractionPath.className = 'float-left source-folder-path'
        extractionPath.innerHTML = pathObj['path']

        let inp = document.createElement('input')
        inp.className = 'float-left source-folder-depth'
        inp.value = pathObj['depth']

        let inp2 = document.createElement('input')
        inp2.className = 'float-left source-folder-quantity'
        inp2.value = pathObj['count']

        let button = document.createElement('div')
        button.className = 'float-left source-folder-remove button'
        button.innerHTML = 'Remove'
        button.addEventListener('click', ()=>{removeSourceFolder(g)})

        row.appendChild(extractionPath)
        row.appendChild(inp2)
        row.appendChild(inp)
        row.appendChild(button)

        sourcesParent.appendChild(row)
        sourcesParent.appendChild(document.createElement('br'))
        sourcesParent.appendChild(document.createElement('br'))

        i++
    }

    document.getElementById('add-source-folder').addEventListener('click', addSourceFolder)
    document.getElementById('target-change').addEventListener('click', targetChange)
    document.getElementById('save-config').addEventListener('click', saveSettings)
    document.getElementById('reset').addEventListener('click', reset)
    document.getElementById('export').addEventListener('click', shuffle)
    document.getElementById('save-db').addEventListener('click', saveDB)

    document.getElementById('target-path').innerHTML = appdata.config['destinationPath']

    document.getElementById('max-per-artist-input').value = appdata.config['maxPerArtist']

    document.getElementById('exports-since-reset-num').innerHTML = appdata.config['exportsSinceReset']

    for(let msg of appdata.messages) {
        alert(msg)
        // console.log(msg)
    }

    appdata.messages = []
}

function log(msg) {
    ipcRenderer.send('log', msg)
}

function refr(ad) {
    ipcRenderer.send('refr', ad)
}

function removeSourceFolder(i) {
    let modPathObjs = [].concat(appdata.config['extractionPaths'])

    let p = modPathObjs[i]
    modPathObjs.splice(i, 1)
    appdata.config['extractionPaths'] = modPathObjs
    appdata.config = conf.saveConfig(appdata.config)
    appdata.connection.updateJSONRemoved(p, appdata.config)
    refr(appdata)
}

function saveDB(e) {

    appdata.connection.getSongs(appdata.config)
    alert('Files Updated.')
}

function saveSettings(e) {
    let val = document.getElementById('max-per-artist-input').value
    if(isNaN(val)) {
        appdata.config['maxPerArtist'] = parseInt(0)
    }
    else {
        appdata.config['maxPerArtist'] = parseInt(val)
    }

    let i = 0
    for(let folder of appdata.config['extractionPaths']) {

        appdata.config['extractionPaths'][i].count = document.getElementsByClassName('source-folder-quantity')[i].value
        appdata.config['extractionPaths'][i].depth = document.getElementsByClassName('source-folder-depth')[i].value
        i++
    }

    appdata.config = conf.saveConfig(appdata.config)
    //addMessage('Settings saved.')
    alert('Changes Saved.')
}

function addSourceFolder(e) {
    let data = remote.dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if(data != null) {

        let pathObjs = []

        let newPathObj = {'path':data[0],'count':0, 'depth':1}

        if(appdata.config['extractionPaths'].length > 0) {
            pathObjs = pathObjs.concat(appdata.config['extractionPaths'])
        }

        pathObjs.push(newPathObj)

        appdata.config['extractionPaths'] = pathObjs

        appdata.config = conf.saveConfig(appdata.config)
        appdata.connection.updateJSONAdded(data[0], appdata.config)
        refr(appdata)
    }
}

function targetChange(e) {
    let data = remote.dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if(data != null) {

        appdata.config['destinationPath'] = data[0]

        appdata.config = conf.saveConfig(appdata.config)

        refr(appdata)
    }
}

function reset(e) {
    appdata.config['exportsSinceReset'] = 0
    appdata.config = conf.saveConfig(appdata.config)
    //addMessage('Reset.')
    appdata.connection.reset()
    appdata.connection.getSongs(appdata.config)
    alert('Reset.')
    refr(appdata)
}

function shuffle(e) {

    let msgs = shuffler.exportPlaylist(appdata)

    addMessages(msgs)

    appdata.config = conf.saveConfig(appdata.config)

    // for(let msg of msgs) {
    //     log(msg)
    // }

    refr(appdata)
}

function addMessage(msg) {
    let msgs = [].concat(appdata.messages)
    msgs.push(msg)
    appdata.messages = msgs
}

function addMessages(msg) {
    let msgs = msg.concat(appdata.messages)
    appdata.messages = msgs
}

document.body.onload = appSetup;
