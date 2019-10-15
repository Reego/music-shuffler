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
        button.addEventListener('click', ()=>{ipcRenderer.send('removeSourceFolder',g)})

        row.appendChild(extractionPath)
        row.appendChild(inp2)
        row.appendChild(inp)
        row.appendChild(button)

        sourcesParent.appendChild(row)
        sourcesParent.appendChild(document.createElement('br'))
        sourcesParent.appendChild(document.createElement('br'))

        i++
    }

    document.getElementById('add-source-folder').addEventListener('click', ()=>ipcRenderer.send('addSourceFolder', null))
    document.getElementById('target-change').addEventListener('click', ()=>ipcRenderer.send('targetChange',null))
    document.getElementById('save-config').addEventListener('click', ()=> {

        let params = {
            'max-per-artist-input':1,
            'source-folder-quantity':[],
            'source-folder-depth':[]
        }
        params['max-per-artist-input'] = document.getElementById('max-per-artist-input').value

        let sfq = document.getElementsByClassName('source-folder-quantity')
        let sfd = document.getElementsByClassName('source-folder-depth')
        for(let i = 0; i < sfq.length; i++) {
            params['source-folder-quantity'].push(sfq[i].value)
            params['source-folder-depth'].push(sfd[i].value)
        }

        ipcRenderer.send('saveSettings', params)
    }
    )
    document.getElementById('reset').addEventListener('click', ()=>ipcRenderer.send('rreset', null))
    document.getElementById('export').addEventListener('click', ()=>{document.body.innerHTML = 'Generating playlists...';ipcRenderer.send('shuffle', null)})

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

document.body.onload = appSetup;
