const fs = require('fs')
const ospath = require('path')
const { BlockedConnection } = require('./connection')
const readline = require('readline')

const SHUFFLE_ITERATIONS = 5

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

function exportPlaylist(appdata) {

    let msgs = []
    // let k = 1

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

    if(appdata.config['extractionPaths'].length === 0) {
        msgs.push('No source folders to export from.')
        return msgs
    }

    let [songs, totals] = appdata.connection.getPreSongs(appdata.config)

    let i = 0

    // console.log(appdata.connection.filterSongsByFolder)
    // console.log(appdata.connection)

    let hasSongs = true
    let setSongs = true

    for(let folder of songs) {
        if(songs.length > 0 && !hasSongs) {
            hasSongs = true
        }
        if(appdata.config['extractionPaths'][i].count > 0 && !setSongs) {
            setSongs = true
        }
        songs[i] = appdata.connection.filterSongsByFolder(appdata.config['extractionPaths'][i].path, folder)
        i++
    }


    let potentialPlaylists = []
    for(let g = 0; g < SHUFFLE_ITERATIONS; g++) {
        potentialPlaylists.push(generatePlaylist(songs, appdata.config))
    }

    let playlist = potentialPlaylists.sort(
        (a, b) => (a.length > b.length) ? 1 : -1
    )[0]
    //msgs.push('Playlist length: ' + playlist.length)

    if(!setSongs) {
        msgs.push('The number of total songs must be at least 0')
        return msgs
    }
    else if(playlist.length === 0 && hasSongs) {
        msgs.push('There are no more songs left, please add more')
        return msgs
    }

    let target = appdata.config['destinationPath']
    for(let item of fs.readdirSync(target)) {
        let ext = ospath.extname(item)
        let base = ospath.basename(item)

        if(ext === '.mp3' && base.includes('__SFL__')) {
            fs.unlinkSync(ospath.join(target, base))
        }
    }

    for(let song of playlist) {
        let base = ospath.basename(song.path)

        fs.copyFileSync(song.path, ospath.join(target, '__SFL__' + base))
        appdata.connection.blockSong(song)
    }

    i = 0
    for(let pathObj of appdata.config['extractionPaths']) {

        let minNum = parseInt(pathObj.count)

        let total = totals[i]

        // for(let item of fs.readdirSync(pathObj.path)) {
        //     if(ospath.extname(item) === '.mp3') {
        //         total++
        //     }
        // }

        // if(pathObj.depth === '2' || pathObj.depth === 2) {
        //     for(let subDir of getDirectories(pathObj.path)) {
        //         let tp = ospath.join(pathObj.path, subDir)
        //         for(let item of fs.readdirSync(tp)) {
        //             if(ospath.extname(item) === '.mp3') {
        //                 total++
        //             }
        //         }
        //     }
        // }

        //benchMark('Hola')

        let blocked = appdata.connection.getBlockedNum(pathObj.path)

        //benchMark('Hola 2')

        let left = total - blocked

        if(left <= minNum) {
            msgs.push('There are ' + left + ' unblocked songs left in the folder ' + pathObj.path + '. Please add more songs or reset the app.')
        }

        i++
    }

    //benchMark('COUNTS')

    msgs.push('Exported')

    appdata.config['exportsSinceReset']++

    return msgs
}

function generatePlaylist(songs, config) {

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

            if (song.artist !== '') {

                if(song.artist in artistCounts) {
                    if(artistCounts[song.artist] < maxPer) {
                        artistCounts[song.artist] += 1
                    }
                    else {
                        folder.splice(selectedIndex, 1)
                        continue
                    }
                }
                else {
                    artistCounts[song.artist] = 1
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

module.exports = {
    'exportPlaylist':exportPlaylist,
    'Song':Song
}
