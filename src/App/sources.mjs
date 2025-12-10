//Module that manages video source connections
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
import { sourceAPI } from '../classes/sourceAPI.mjs'

import { isDev, platform, shortID } from '../common/util.mjs'

export const sourceManager = {}
const sources = new Map()

sourceManager.sourcePath = 'source'

//wsmanager.update.eventNames()

//websocket module event emitter
sourceManager.update = new EventEmitter()

sourceManager.createSource = () => {

    const source = {
        id: shortID(), 
        type: 'device', 
        label: 'test device'
    }

    sources.set(source.id, null)

    const server_port = config.get('config/User/WebsocketPort')
    
    const args = {
        worker: true, 
        port: server_port, 
        path: sourceManager.sourcePath, 
        token: source.id, 
    }

    //encode JSON to launch arguments(see main.js for decode)
    const argstring = Object.keys(args).reduce((a, c) => a += `${c}="${args[c]}" `, '')

    try{
        //create subprocess
        //exec(`npm run worker ${argstring}`)

        //add entry to session config
        config.set(`session/Sources/${source.id}`, source)
        console.log(`Source added(${source.id})`)
    }
    catch(error){
        console.error(`Failed to create source: ${error}`)
    }
    
}

function registerSource(id, websocket){
    if(sources.has(id)){
        sources.set(id, new sourceAPI(websocket))
    }
    else{
        //id not recognized
        websocket.close()
    }
    
    /*TODO: register events(only one callback per event)

    sources.get(id).on('event', () => {})
    sources.get(id).off('event)

    sources.get(id).request(api, data)
      .then((data) => {})
      .catch((error) => {})
    */
}

sourceManager.removeSource = (id) => {
    //TODO: send disconnection to subprocess
    sources.delete(id)
    config.delete(`session/Sources/${id}`)
    console.log(`Source removed(${id})`)
}

/*
config.update.on('session/Sources', (sourceObj) => {
    for(const s of Object.keys(sourceObj || {})){
        if(false){
            //source does not have subprocess yet
            createSource()
        }
        if(false){
            //source is no longer listed
            removeSource()
        }
    }
})*/