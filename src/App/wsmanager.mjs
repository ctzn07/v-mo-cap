//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'

export const wsmanager = {}

var wss = null

const workers = new Map()

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

class Worker {
    #websocket
    #token = crypto.randomUUID().split('-').at(-1)
    constructor(device) {
        this.device = device
        //new websocket connection events listener for this device ID
        wsmanager.update.on(this.#token, (ws) => this.connect(ws))
        //create event listener for each method
        for(const m of Object.getOwnPropertyNames(Worker.prototype)){
            wsmanager.update.on(`worker/${this.device}/${m}`, (...args) => this[m](...args))  
        }
    }

    connect(ws){
        //TODO: check if ws is already connected
        this.#websocket = ws
        this.#websocket.on('message', (...args) => this.receive(...args))
        this.#websocket.on('error', (...args) => this.error(...args))
        this.#websocket.on('close', (...args) => this.close(...args))
    }

    disconnect(ws){

    }

    reconnect(newPort){
        //TODO: send worker new port to connect to
        //terminate websocket connection
    }

    start(port){
        console.log(`${this.device} Worker.start(${port})`)
        if(isDev()){
            //exec(`npm run worker worker="true" port="${port}" token="${this.#token}"`, (...args) => this.io_callback(...args))
        }
        else{
            this.error('Worker spawning not set up for production')
            //TODO: terminate worker
        }
    }

    io_callback(error, stdout, stderr){
        if(error || stderr)console.error(`${this.device} : ${error || ''}, ${stderr || ''}`)
        if(stdout)console.log(`${this.device} : ${stdout || ''}`)
    }

    receive(data, isBinary){
        if(!isBinary){
            //data format: {api: channel, data: packet}
            const packet = JSON.parse(data)
            switch (packet.api) {
                case 'console.log':
                    console.log(packet.data)
                    break;

                case 'console.error':
                    console.error(packet.data)
                    break;
            
                default:
                    break;
            }
        }
        else console.error(`${this.device} received binary data`)
    }

    error(e){
        console.error(`${this.device} error: ${e || '-'}`)
    }

    terminate(code, reason){
        console.log(`${this.device} Worker.terminate(${code}, ${reason})`)
        //worker is permanently closed

        //remove event listener for each method
        for(const m of Object.getOwnPropertyNames(Worker.prototype)){
            wsmanager.update.removeAllListeners(`worker/${this.device}/${m}`)  
        }
        //TODO: close websocket
        if(this.#websocket.readyState === WebSocket.OPEN){
            this.#websocket.close(code || 1000, reason || 'Worker terminated')
        }
        //TODO: set all members of class to null(for garbage collection)
    }

    stop(reason){
        
    }
}

const newToken = () => {
    const token = crypto.randomUUID()
    setTimeout(() => wsmanager.update.removeAllListeners(token), 3000)
    return token
}

function createWorker(device){
    new Worker(device)
    wsmanager.update.emit(`worker/${device}/start`, wss.address().port)
}

function removeWorker(device){ 
    wsmanager.update.emit(`worker/${device}/terminate`, 'device disconnected')
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