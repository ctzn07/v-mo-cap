//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'
import { js } from 'three/tsl'

export const wsmanager = {}

var wss = null

const workers = new Map()

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

const io_logger = (error, stdout, stderr) => {
    //if(error){console.error('WORKER:', error)}
    //if(stdout){console.log('WORKER:', stdout)}
    //if(stderr){console.error('WORKER:', stderr)}
}

class Worker {
    #websocket  
    constructor(device) {
        this.device = device
    }

    start(token, port){
        wsmanager.update.once(token, (ws) => this.connect(ws))
        if(isDev()){ exec(`npm run worker worker="true" port="${port}" token="${token}"`, (...args) => io_logger(...args)) }
        else{ this.error('Worker spawning not set up for production') }
    }

    connect(ws){
        this.#websocket = ws
        this.#websocket.on('message', (...args) => this.message(...args))
        this.#websocket.on('error', (...args) => this.error(...args))
        this.#websocket.on('close', (...args) => this.close(...args))
    }

    message(data, isBinary){
        const packet = JSON.parse(data)
        console.log('received:', JSON.stringify(packet))
    }

    detect(){

    }

    error(e){

    }

    close(code, reason){

    }

    stop(reason){
        console.log(`${this.device} stopped: ${reason}`)
        this.#websocket.close(1000, 'Worker stopped')
        workers.delete(this.device)
    }
}



const newToken = () => {
    const token = crypto.randomUUID()
    setTimeout(() => wsmanager.update.removeAllListeners(token), 3000)
    return token
}

function createWorker(device){
    if(!workers.has(device)){
        console.log(`creating worker for device ${device}`)
        workers.set(device, new Worker(device))
        workers.get(device).start(newToken(), wss.address().port)
    }
    else {
        console.error(`createWorker: ${device} already has a worker`)
    }
}

function removeWorker(device){ 
    if(workers.has(device)){
        console.log(`removing worker for device ${device}`)
        workers.get(device).stop('Device disconnected')
    }
    else{
        console.error(`removeWorker: no worker for ${device} found`)
    }
}

function updateWorkers(list){
    const oldList = new Set(workers.keys() || [])
    const newList = new Set(list || [])

    for(const d of newList){
        //old list does not have this device -> create new worker
        if(!oldList.has(d)){ createWorker(d) }
    }

    for(const d of oldList){
        //new list of connected devices does not have this device -> remove worker
        if(!newList.has(d)){ removeWorker(d) }
    }
}

wsmanager.start = () => {
    const wsport = config.get('config/User/WebsocketPort')

    try{
        wss = new WebSocketServer({ port: wsport, perMessageDeflate: false })
        wss.on('connection', (ws, req) => { wsmanager.update.emit(req.url.split('/').at(-1), ws) })
        //newConnection(ws, req.url.split('/').at(-1))
        wss.on('close', (ws) => console.log('WSS server connection closed'))
        wss.on('listening', () => console.log(`WSS listening at port ${wsport}`))
        wss.on('error', (err) => console.error('WSS error: ', err))
    }
    catch (e) { console.error('Error starting WSS - ', e) }
}

wsmanager.stop = (msg = '') => { wss.close(() => console.log('WSS closed:', msg)) }

//if websocket port changes, restart server
config.update.on('config/User/WebsocketPort', (value) => {
    //TODO: reconnect all devices
    wsmanager.stop(`config changed, restarting`)
    wsmanager.start()
})

config.update.on('session/Devices/Connected', (list) => updateWorkers(list))

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart