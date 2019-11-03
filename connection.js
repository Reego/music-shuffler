const fs = require('fs')
const ospath = require('path')
const conf = require('./config')
const { Song } = require('./shuffler')

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
      //this.getJSON()

      this.root = {'folders':{},'unblockedFolders':{}}

      // for(let folder of this.root.folders) {
      //   folder.songs = []
      // }
      // for(let unblockedFolder of this.root.unblockedFolders) {
      //   unblockedFolder.songs = []
      // }
      this.save()
    }

    blockSong(song) {

      let msg = ''

      console.log('OWNER DIR ' + song.ownerDir)

      this.root.folders[song.ownerDir].songs[song.path] = song
      delete this.root.unblockedFolders[song.ownerDir].songs[song.path]
    }

    updateJSONAdded(path, config) {

      if(path in this.root.folders) {
        return
      }

      this.root.folders[path] = {
        'songs':{}
      }
      this.root.unblockedFolders[path] = {
        'songs':{}
      }

      this.save()
      this.updateSongs(config)
    }

    updateJSONRemoved(path, config) {

      delete this.root.folders[path]
      delete this.root.unblockedFolders[path]
      this.save()
      this.updateSongs(config)
    }

    getSongs(config) {
      throw new Exception("Obsolete!")
      // let songs = []
      // let songsNums = []
      // for(let pathObj of config['extractionPaths']) {

      //     let folder = []

      //     if(pathObj.depth === 2) {

      //         for(let subdir of getDirectories(pathObj.path)) {

      //             let source = ospath.join(pathObj.path, subdir)
      //             for(let item of fs.readdirSync(source)) {
      //                 if(ospath.extname(item) === '.mp3') {

      //                     let path = ospath.join(source, item)
      //                     let tags = ni3.read(path)

      //                     let artist = tags.artist

      //                     if(artist === undefined || artist === null || artist === '') {
      //                         artist = ''
      //                     }

      //                     folder.songs.push(new Song(path, pathObj.path, artist, 2))
      //                 }
      //             }
      //         }
      //     }

      //     let source = pathObj.path
      //     for(let item of fs.readdirSync(source)) {
      //         if(ospath.extname(item) === '.mp3') {

      //             let path = ospath.join(source, item)
      //             let tags = ni3.read(path)

      //             let artist = tags.artist

      //             if(artist === undefined || artist === null || artist === '') {
      //                 artist = ''
      //             }

      //             folder.songs.push(new Song(path, path, artist))
      //         }
      //     }

      //     songs.push(folder)
      //     songsNums.push(folder.length)
      // }

      // this.songs = songs
      // this.songsNums = songsNums
    }

    updateSongs(config) {

      this.songs = []
      this.songsNum = 0
      if(config['extractionPaths'].length === 0) {
        return
      }

      for(let pathObj of config['extractionPaths']) {
        this.root.folders[pathObj.path] = {'songs':{}}
        this.root.unblockedFolders[pathObj.path] = {'songs':{}}
      }

      for(let pathObj of config['extractionPaths']) {

          if(pathObj.depth === 2) {

              for(let subdir of getDirectories(pathObj.path)) {

                  let source = ospath.join(pathObj.path, subdir)
                  for(let item of fs.readdirSync(source)) {
                      if(ospath.extname(item) === '.mp3') {
                        let path = ospath.join(source, item)
                        if(!(path in this.root.folders) && !(path in this.root.unblockedFolders)) {

                          this.root.unblockedFolders[pathObj.path].songs[path] = new Song(path, pathObj.path, '', 2)
                        }
                      }
                  }
              }
          }

          let source = pathObj.path
          for(let item of fs.readdirSync(source)) {
              if(ospath.extname(item) === '.mp3') {

                let path = ospath.join(source, item)
                if(!(path in this.root.folders) && !(path in this.root.unblockedFolders)) {

                  this.root.unblockedFolders[pathObj.path].songs[path] = new Song(path, pathObj.path, '', 1)
                }
              }
          }
      }

      this.songs = []
      let songsNum = 0

      for(let unblockedFolder in this.root.unblockedFolders) {

        let uf = this.root.unblockedFolders[unblockedFolder]
        let folder = []
        for(let songk in uf.songs) {
          folder.push(uf.songs[songk])
          songsNum++
        }

        this.songs.push(folder)
      }

      this.songsNum = songsNum

      this.save()
    }

    getPreSongs(config) {
      if(this.songs === undefined || this.songs.length === 0) {
        this.updateSongs(config)
      }
      return [this.songs, this.songsNums]
    }

    save() {

      for(let folder in
       this.root.folders.values) {
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

      let unblockedSongs = []
      for(let song of songs) {
        if(!(song.path in this.root.folders[song.ownerDir])) {
          unblockedSongs.push(song)
        }
      }

      return unblockedSongs
    }
}

module.exports = {
    'BlockedConnection':BlockedConnection
}
