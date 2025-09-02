//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'

export const wsmanager = {}
const connections = new Map()

var wss = null

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()


const connect = (d) => {
    //create connection reservation for this device
    //spawn new tracker instance
    console.log(`starting tracker for ${d}`)
    //start tracker process with id as argument
    if(isDev())exec(`npm run dev tracker=true device=${d}`, (...args) => console.log('TRACKER:', ...args))
    else null//TODO: run packaged tracker .exe here
}

const disconnect = (d) => {
    //disconnect tracker for this device
    //remove token from connection list
    //set device active status to false
}

const newConnection = (ws, req) => {
    const id = req.url.split('/').at(-1)  //get connection ID
    //create event bindings for new connection
    ws.on('open', () => {
        //tracker connection open
        console.log('new ws connection open')
    })
    ws.on('upgrade', (res) => {
        //connection upgrade event with response
        console.log('ws connection upgraded')
    })
    ws.on('message', (data, isBinary) => {
        console.log('ws connection sent data:', data)
    })
    ws.on('close', (code, reason) => {
        //what to do when client disconnects
        console.log(code, ' - ws connection closed:', reason)
    })
}

wsmanager.start = () => {
    const wsport = config.get(['config', 'User', 'WebsocketPort'])
    if(typeof wsport === 'number'){
        wss = new WebSocketServer({port: wsport})
        wss.on('connection', (ws, req) => newConnection(ws, req))
        wss.on('close', (ws) => {/* ??? */})
        wss.on('listening', () => console.log(`WSS listening at port ${wsport}`))
        wss.on('error', (err) => console.error('WSS error: ', err))
    }
    else{
        console.error('Error starting WSS - no port defined')
    }
}

wsmanager.stop = (msg = '') => {
    //todo: kill all active connections
    //1001	Going Away
    //1006	Abnormal Closure
    //1012	Service Restart
    wss.close(() => console.log('WSS closed:', msg))
}

//if websocket port changes, restart server
config.update.on('WebsocketPort', (path, value) => {
    //TODO: send instructions to all trackers for reconnection
    wsmanager.stop(`config changed, restarting`)
    wsmanager.start()
})

config.update.on('Active', (path, value) => {
    value ? connect(path.at(-2)) : disconnect(path.at(-2))
})