class Song {

    constructor(path, ownerDir=null, artist=null, depth=1) {
        this.path = path
        this.ownerDir = ownerDir
        this.artist = artist
        this.depth = depth
    }
}

module.exports = {
    'Song':Song
}
