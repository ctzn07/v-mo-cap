//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
import { WsInterface } from '../classes/wsInterface.mjs'

export const wsmanager = {}

var wss = null

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

function createWorker(device){
    const token = crypto.randomUUID().split('-').at(-1)

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

    const args = {
        worker: true, 
        device: String(device), 
        port: Number(wss.address().port), 
        token: token, 
    }

    //encode JSON to launch arguments(see main.js for decode)
    const format = (obj) => Object.keys(obj).reduce((a, c) => a += `${c}="${args[c]}" `, '')

    exec(`npm run worker ${format(args)}`)
}

function removeWorker(device){
    config.get(`session/Devices/${device}/Interface`)
        .request('disconnect')
        .then(() => config.set(`session/Devices/${device}/Interface`, null))
        .catch(e => console.error(e))
    
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

wsmanager.start = (port) => {
    console.log('wsmanager.start', port)
    try{
        wss = new WebSocketServer({ port: port, perMessageDeflate: false, clientTracking: true })
        wss.on('connection', (ws, req) => newConnection(ws))
        wss.on('close', (ws) => console.log('client disconnected'))
        wss.on('listening', () => console.log(`Websocket listening port ${port}`))
        wss.on('error', (err) => console.error('Websocket error: ', err))
    }
    catch (e) { console.error('Error starting WSS - ', e) }
}

wsmanager.stop = () => {
    console.log('wsmanager.stop')
    //note: WebsocketServer.close() gets ignored unless you supply it with callback as argument
    wss.close(() => console.log('asd'))
}

//if websocket port changes, restart server
config.update.on('config/User/WebsocketPort', (port) => {
    wsmanager.stop()
    setTimeout(() => {
        wsmanager.start(port)
    }, 1000);
    
})

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart