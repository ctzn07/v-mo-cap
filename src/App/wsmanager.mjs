//Module that manages tracker connections
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
import { WsInterface } from '../classes/wsInterface.mjs'

export const wsmanager = {}

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

function createWorker(device){
    const token = crypto.randomUUID().split('-').at(-1)
    const server_port = config.get('config/User/WebsocketPort')

    /*
    //event listener for the connection
    wsmanager.update.once(token, (wsi) => {
        console.log('worker registered')
        config.set(`session/Devices/${device}/Interface`, wsi)

        //on connection closure
        wsi.on('close', (code, reason) => {
            config.set(`session/Devices/${device}/Active`, false)
            config.set(`session/Devices/${device}/Interface`, null)
        })
        //wsi.request('ping').then((res) => console.log(`response: ${res}`)).catch(e => console.error(e))
    })
    */
    
    const args = {
        worker: true, 
        device: String(device), 
        port: server_port, 
        token: token, 
    }

    //encode JSON to launch arguments(see main.js for decode)
    const argstring = Object.keys(args).reduce((a, c) => a += `${c}="${args[c]}" `, '')

    console.log(argstring)
    try {
        exec(`npm run worker ${argstring}`)
    } catch (error) {
        console.error(error)
    }
}

function removeWorker(device){
    /*
    config.get(`session/Devices/${device}/Interface`)
        .request('disconnect')
        .then(() => config.set(`session/Devices/${device}/Interface`, null))
        .catch(e => console.error(e))
    */
    console.log(`Worker removed(${device})`)
}

//TODO: way to register clients, look into that when doing plugins
function newConnection(ws){
    const wsi = new WsInterface(ws)
    wsi.on('console.log', msg => console.log(msg))
    wsi.on('register-worker', (token) => wsmanager.update.emit(token, wsi))
}

config.update.on('session/Devices', (devices) => {
    for(const d of Object.keys(devices || {})){
        if(devices[d].Active && !devices[d].Interface){
            //device is active but has no interface, create new worker
            createWorker(d)
        }
        if(!devices[d].Active && devices[d].Interface){
            //device is not active and has active interface, remove worker
            removeWorker(d)
        }
    }
})