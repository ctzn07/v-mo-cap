//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'

export const wsmanager = {}

var wss = null

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

const io_logger = (error, stdout, stderr) => {
    //if(error){console.error('WORKER:', error)}
    //if(stdout){console.log('WORKER:', stdout)}
    //if(stderr){console.error('WORKER:', stderr)}
}

function createWorker(device){
    const port = config.get(['config', 'User', 'WebsocketPort'])
    if(isDev()){ exec(`npm run worker worker=true port=${port} device="${device}"`, (...args) => io_logger(...args)) }
    else{ console.error('wsmanager.mjs - Worker spawning not set up for production') }
}

function removeWorker(device){

}

wsmanager.start = () => {
    const wsport = config.get('config/User/WebsocketPort')
    try{
        wss = new WebSocketServer({ port: wsport, perMessageDeflate: false })
        
        wss.on('connection', (ws, req) => {
                ws.on('message', (data, isBinary) => { console.log(JSON.parse(data)) })
                ws.on('error', (e) => { })
                ws.on('close', (code, reason) => { })
        })

        wss.on('close', (ws) => console.log('WSS server connection closed'))
        wss.on('listening', () => console.log(`WSS listening at port ${wsport}`))
        wss.on('error', (err) => console.error('WSS error: ', err))
    }
    catch (e) { console.error('Error starting WSS - ', e) }
}

wsmanager.stop = (msg = '') => { wss.close(() => console.log('WSS closed:', msg)) }

//if websocket port changes, restart server
config.update.on('WebsocketPort', (path, value) => {
    //TODO: reconnect all devices
    wsmanager.stop(`config changed, restarting`)
    wsmanager.start()
})

config.update.on('Devices', (value) => {
    //console.log('New Devices Event:')
    
})

//config.update.on('Devices', (path, value) => console.log('Devices update:', path.join('>'), ':', value))

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart