//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'

export const wsmanager = {}

var wss = null

const tokenMap = new Map()
const wsMap = new Map()

//wsmanager.update.eventNames()

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

const io_logger = (error, stdout, stderr) => {
    //if(error){console.error('WORKER:', error)}
    //if(stdout){console.log('WORKER:', stdout)}
    //if(stderr){console.error('WORKER:', stderr)}
}

const newConnection = (ws, token) => {
    const device = tokenMap.get(token)
    if(tokenMap.has(token) && wsMap.has(device)){  
        //incoming events
        ws.on('message', (data, isBinary) => wsMap.get(device).emit('message', data, isBinary))
        ws.on('error', (e) => console.error(device, ': ', e))
        ws.on('close', (code, reason) => {
            console.log(`${device} disconnected: ${code} - ${reason}`)
            //clean up eventlisteners for the connection
            wsMap.get(device).removeAllListeners()
            wsMap.delete(device)
            //if device is still active, reconnect
            if(config.get(`session/Devices/${device}/Active`)){
                console.log(`Reconnecting ${device}...`)
                createWorker(device)
            }
        })

        //outgoing events
        wsMap.get(device).on('send', (data) => ws.send(data))
        wsMap.get(device).on('disconnect', (code, reason) => ws.close(code, reason))
    }
    else{ ws.close(3000, '401 - Unauthorized') }
}

function createWorker(device){
    if(!wsMap.has(device)){
        wsMap.set(device, new WSEmitter())
        console.log(`no previous connection found for ${device}, creating new...`)

        const token = crypto.randomUUID()
        tokenMap.set(token, device)
        setTimeout(() => tokenMap.delete(token), 3000)

        const port = config.get('config/User/WebsocketPort')
        if(isDev()){ exec(`npm run worker worker=true port=${port} token="${token}"`, (...args) => io_logger(...args)) }
        else{ console.error('wsmanager.mjs - Worker spawning not set up for production') }
    }
    else{ console.log(`${device} already has an active connection, aborting`) }
}

wsmanager.start = () => {
    const wsport = config.get('config/User/WebsocketPort')
    try{
        wss = new WebSocketServer({ port: wsport, perMessageDeflate: false })
        wss.on('connection', (ws, req) => { newConnection(ws, req.url.split('/').at(-1)) })
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

config.update.on('session/Devices', (Devices) => {
    //const Devices = config.get('session/Devices')
    for(const d of Object.keys(Devices)){
        //device is available but has no connection
        if(Devices[d].Available === true && !wsMap.has(d)){ createWorker(d) }
        //device is not available anymore but has connection
        if(Devices[d].Available === false && wsMap.has(d)){ wsMap.get(d).emit('disconnect', 1000, 'Device disconnected') }
    }
})

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart