const fs = require('fs')
const ospath = require('path')
const conf = require('./config')
const { Song } = require('./shuffler')
const ni3 = require('node-id3')

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

class BlockedConnection {

    constructor(path) {
        this.path = path
        //this.xml = this.builder.buildObject
        this.root = this.getJSON()
        this.prevBlockedSong = {'path':'', 'index':0}
        this.songs = []
    }

    getJSON() {

        let result = null
        try {
            let data = fs.readFileSync(ospath.join(this.path, 'sample.json'))
            result = JSON.parse(data)
        }
        catch (err) {
            log(err)
            result = null
        }

        return result
    }

    reset() {
      this.root = {'folders':[]}
      this.save()
    }

    blockSong(song) {

      let msg = ''
      let folderPath = song.ownerDir

      if(this.prevBlockedSong.path === song) {
        this.root.folders[this.prevBlockedSong.index].songs.push(song)
        return
      }

      let g = 0
      for(let folder of this.root.folders) {
        if(folder.path === folderPath) {
          // let temp = [].concat(folder.songs)
          // temp.push(song)
          //folder.songs = temp
          folder.songs.push(song)
          this.save()

          this.prevBlockedSong = {'path':folderPath, 'index':g}
          return
        }
        g++
      }

      let folder = {
        'path':folderPath,
        'songs':[song]
      }

      // let temp = [].concat(this.root.folders)
      // temp.push(folder)
      this.root.folders.push(folder)
      this.save()
    }

    updateJSONAdded(path, config) {
      let folder = {
        'path':path,
        'songs':[]
      }
      let temp = [].concat(this.root.folders)
      temp.push(folder)
      this.root.folders = temp
      this.save()
      this.getSongs(config)
    }

    updateJSONRemoved(path, config) {
      let i = 0
      for(let folder of this.root.folders) {
        if(folder.path === path) {
          this.root.folders.splice(i, 1)
          this.save()
          return
        }
        i++
      }
      this.getSongs(config)
    }

    getSongs(config) {
      let songs = []
      let songsNums = []
      for(let pathObj of config['extractionPaths']) {

          let folder = []

          if(pathObj.depth === 2) {

              for(let subdir of getDirectories(pathObj.path)) {

                  let source = ospath.join(pathObj.path, subdir)
                  for(let item of fs.readdirSync(source)) {
                      if(ospath.extname(item) === '.mp3') {

                          let path = ospath.join(source, item)
                          let tags = ni3.read(path)

                          let artist = tags.artist

                          if(artist === undefined || artist === null || artist === '') {
                              artist = ''
                          }

                          folder.push(new Song(path, pathObj.path, artist, 2))
                      }
                  }
              }
          }

          let source = pathObj.path
          for(let item of fs.readdirSync(source)) {
              if(ospath.extname(item) === '.mp3') {

                  let path = ospath.join(source, item)
                  let tags = ni3.read(path)

                  let artist = tags.artist

                  if(artist === undefined || artist === null || artist === '') {
                      artist = ''
                  }

                  folder.push(new Song(path, path, artist))
              }
          }

          songs.push(folder)
          songsNums.push(folder.length)
      }

      this.songs = songs
      this.songsNums = songsNums
    }

    getPreSongs(config) {
      if(this.songs.length === 0) {
        this.getSongs(config)
      }
      return [this.songs, this.songsNums]
    }

    getBlockedNum(path) {
      for(let folder of this.root.folders) {
        if(folder.path === path) {
          return folder.songs.length
        }
      }
      return 0
    }

    save() {

      for(let folder of this.root.folders) {
        if(folder.depth === 1) {
          let indices = []
          let i = 0
          for(let song of folder.songs) {
            if(song.depth === 2) {
              indices.push(i)
            }
            i++
          }

          for(let g = indices.length - 1; g >= 0; g--) {
            folder.splice(indices[g], 1)
          }
        }
      }

      fs.writeFileSync(ospath.join(conf.PROJ_DIR, 'sample.json'), JSON.stringify(this.root))
    }

    filterSongsByFolder(folderPath, songs) {

      let blockedSongs = []
      for(let folder of this.root.folders) {
        if(folder.path === folderPath) {
          for(let song of folder.songs) {
            blockedSongs.push(new Song(song.path))
          }
          break
        }
      }

      let unblockedSongs = []
      for(let song of songs) {
        let isBlocked = false
        for(let blockedSong of blockedSongs) {
          if(song.path === blockedSong.path) {
            isBlocked = true
            break
          }
        }

        if(!isBlocked) {
          unblockedSongs.push(song)
        }
      }

      return unblockedSongs
    }
}

module.exports = {
    'BlockedConnection':BlockedConnection
}
