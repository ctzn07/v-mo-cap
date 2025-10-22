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
        workers.set(device, new Worker(device, wsmanager.update))
        workers.get(device).start(wss.address().port)
    }  
}

function removeWorker(device){ 
    if(workers.has(device)){
        workers.get(device).terminate('Device disconnected')
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