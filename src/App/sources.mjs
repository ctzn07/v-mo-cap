//Module that manages video source connections
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
import { sourceAPI } from '../classes/sourceAPI.mjs'

export const sourceManager = {}
const sources = new Map()

//wsmanager.update.eventNames()

//websocket module event emitter
sourceManager.update = new EventEmitter()

function createSource(){
    const token = crypto.randomUUID().split('-').at(-1)
    const server_port = config.get('config/User/WebsocketPort')
    
    const args = {
        worker: true, 
        device: String(device), 
        port: server_port, 
        token: token, 
    }

    //encode JSON to launch arguments(see main.js for decode)
    const argstring = Object.keys(args).reduce((a, c) => a += `${c}="${args[c]}" `, '')

    try {
        exec(`npm run worker ${argstring}`)
    } catch (error) {
        console.error(error)
    }
    console.log(`Source added(${id})`)
    return token
}

function registerSource(id, websocket){
    sources.set(id, new sourceAPI(websocket))
    /*TODO: register events(only one callback per event)

    sources.get(id).on('event', () => {})
    sources.get(id).off('event)

    sources.get(id).request(api, data)
      .then((data) => {})
      .catch((error) => {})
    */
}

function removeSource(id){
    sources.delete(id)
    console.log(`Source removed(${id})`)
}

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
})