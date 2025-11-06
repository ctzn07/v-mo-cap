//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'

import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'
//import { Worker } from '../classes/worker.mjs'
import { WorkerInterface } from '../classes/wsInterface.mjs'

export const wsmanager = {}

var wss = null

const workers = new Map()
const reservations = []

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

function createWorker(device){
    exec(`npm run worker worker="true"`)
    console.log(`New Worker(${device})`)
    reservations.push(device)
}

/*
const packet = {
        id: identifier, 
        api: path, 
        data: o_data || null
    }
*/

function assignWorker(ws){
    const device = reservations.shift()
    if(!device){
        console.error(`Unexpected websocket connection rejected`)
        ws.close(3000, '401 - Unauthorized')
    }
    else{
        workers.set(device, new WorkerInterface(ws))
        workers.get(device).on('close', (code, reason) => console.log('worker disconnected', code, reason))
        workers.get(device).request('ping', 'this is data', 1000).then((res) => console.log(`response: ${res}`)).catch(e => console.error(e))
    }
}

function removeWorker(device){
    console.log(`Worker removed(${device})`)
    //TODO: send disconnect to process assigned for this device
    workers.get(device).request('disconnect')
        .then((r) => {
            console.log(`disconnect done: ${r}`)
            workers.delete(device)
        })
        .catch(e => {
            console.log(`disconnect request failed: ${e}`)
        })
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
            const route = req.url.split('/').at(-1)
            switch (route) {
                //suppose there will be more routes to handle later on
                case 'worker':
                    assignWorker(ws)
                    break 
                default:
                    console.error(`Websocket server rejected connection to ${req.url}`)
                    ws.close(3000, '401 - Unauthorized')
                    break
            }
            
        })
        wss.on('close', (ws) => console.log('Websocket server connection closed'))
        wss.on('listening', () => console.log(`Websocket listening port ${wsport}`))
        wss.on('error', (err) => console.error('Websocket error: ', err))
    }
    catch (e) { console.error('Error starting WSS - ', e) }
}

wsmanager.stop = (msg = '') => { wss.close(() => console.log(msg)) }

//if websocket port changes, restart server
config.update.on('config/User/WebsocketPort', () => {
    wsmanager.stop(`Websocket port changed, restarting server...`)
    wsmanager.start()
    //Note: Workers will automatically reconnect
    //as long as their designated device is set to active
})

config.update.on('session/Devices/Connected', (list) => {updateWorkers(list)})

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart