const fs = require('fs')
const ospath = require('path')

const PROJ_DIR = '/Users/Shared/MusicShuffler'

// function getPathConfig() {

// }

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

function authenticateConfig(config) {

    let toCompare = []
    let toRemove = []

    let subDirs = []

    for(let i = 0; i < config['extractionPaths'].length; i++) {
        if(config['extractionPaths'][i].depth === '2' || config['extractionPaths'][i].depth === 2) {
            for(let subDir of getDirectories(config['extractionPaths'][i].path)) {
                subDirs.push(ospath.join(config['extractionPaths'][i].path, subDir))
            }
        }

        let pathKey = config['extractionPaths'][i]['path']

        if(toCompare.includes(pathKey)) {
            toRemove.push(config['extractionPaths'][i])
        }
        else {
            toCompare.push(pathKey)
        }
    }

    for(let i = 0; i < config['extractionPaths'].length; i++) {
        for(let g = 0; g < subDirs.length; g++) {
            if(subDirs[g] === config['extractionPaths'][i].path && !toRemove.includes(config['extractionPaths'][i])) {
                toRemove.push(config['extractionPaths'][i])
            }
        }
    }

    let xp = [].concat(config['extractionPaths'])

    for(let i = 0; i < toRemove.length; i++) {
        xp.splice(config['extractionPaths'].indexOf(toRemove[i]), 1)
    }
    config['extractionPaths'] = xp

    let l = config['extractionPaths'].length

    let modExtractionPaths = []

    for(let i = 0; i < config['extractionPaths'].length; i++)
    {
        if(fs.existsSync(config['extractionPaths'][i]['path'])) {
            modExtractionPaths.push(config['extractionPaths'][i])

            if(isNaN(config['extractionPaths'][i]['count']) || parseInt(config['extractionPaths'][i]['count']) < 0) {
                config['extractionPaths'][i]['count'] = 0
            }
            else {
                config['extractionPaths'][i]['count'] = parseInt(config['extractionPaths'][i]['count'])
            }

            if(isNaN(config['extractionPaths'][i]['depth']) || parseInt(config['extractionPaths'][i]['depth']) < 1) {
                config['extractionPaths'][i]['depth'] = 1
            }
            else if(parseInt(config['extractionPaths'][i]['depth']) > 2) {
                config['extractionPaths'][i]['depth'] = 2
            }
            else {
                config['extractionPaths'][i]['depth'] = parseInt(config['extractionPaths'][i]['depth'])
            }
        }
    }

    config['extractionPaths'] = modExtractionPaths

    if(!fs.existsSync(config['destinationPath'])) {
        config['destinationPath'] = '/Users/Shared/MusicShuffler'
    }

    if(isNaN(config['maxPerArtist']) || parseInt(config['maxPerArtist']) < 1) {
        config['maxPerArtist'] = 1
    }
    if(isNaN(config['exportsSinceReset']) || parseInt(config['exportsSinceReset']) < 0) {
        config['maxPerArtist'] = 0
    }

    return config
}

function saveConfig(config) {

    let modifiedConfig = authenticateConfig(config)

    fs.writeFileSync(ospath.join(PROJ_DIR, 'config.json'), JSON.stringify(modifiedConfig))

    return modifiedConfig
}

module.exports = {
    'PROJ_DIR':PROJ_DIR,
    'authenticateConfig':authenticateConfig,
    'saveConfig':saveConfig
}
