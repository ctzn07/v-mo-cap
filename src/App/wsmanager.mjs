//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
import { Worker } from '../classes/worker.mjs'

export const wsmanager = {}

var wss = null

const workers = new Map()

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

function createWorker(device){
    if(workers.has(device)){
        console.error(`createWorker: ${device} already has a worker`)
    }
    else {
        workers.set(device, new Worker(device))
        //add token listener
        wsmanager.update.on(workers.get(device).token, (ws) => { workers.get(device).newConnection(ws) })
    }  
}

function removeWorker(device){ 
    if(workers.has(device)){
        //remove token listener
        wsmanager.update.removeAllListeners(workers.get(device).token)
        workers.get(device).terminate(1000, 'Device disconnected')
        workers.delete(device)
    }
    else{
        console.error(`removeWorker: No worker found for device ${device}`)
    }
}

function updateWorkers(list){
    const oldList = new Set(workers.keys() || [])
    const newList = new Set(list || [])

    //old list does not have this device -> create new worker
    for(const d of newList){ if(!oldList.has(d)){ createWorker(d) } }

    //new list of connected devices does not have this device -> remove worker
    for(const d of oldList){ if(!newList.has(d)){ removeWorker(d) } }
}


wsmanager.start = () => {
    const wsport = config.get('config/User/WebsocketPort')

    try{
        wss = new WebSocketServer({ port: wsport, perMessageDeflate: false, clientTracking: true })
        wss.on('connection', (ws, req) => {
            const token = req.url.split('/').at(-1)
            wsmanager.update.emit(token, ws)
        })
        wss.on('close', (ws) => console.log('Websocket server connection closed'))
        wss.on('listening', () => console.log(`Websocket listening port ${wsport}`))
        wss.on('error', (err) => console.error('Websocket error: ', err))
    }
    catch (e) { console.error('Error starting WSS - ', e) }
}

wsmanager.stop = (msg = '') => { wss.close(() => console.log(msg)) }

//if websocket port changes, restart server
config.update.on('config/User/WebsocketPort', (value) => {
    wsmanager.stop(`Websocket port changed, restarting server...`)
    wsmanager.start()
    //Note: Workers will automatically reconnect
    //as long as their designated device is set to active
})

config.update.on('session/Devices/Connected', (list) => updateWorkers(list))

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart