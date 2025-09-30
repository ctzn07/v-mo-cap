//Module that manages tracker connections
import { WebSocketServer } from 'ws'
import EventEmitter from 'node:events'
import { exec, spawn } from 'child_process'
import { config } from '../common/config.mjs'
import { console } from '../common/logger.mjs'

import { isDev, platform } from '../common/util.mjs'

export const wsmanager = {}

var wss = null
const token_timeout = 3000

//websocket module event emitter
class WSEmitter extends EventEmitter {}
wsmanager.update = new WSEmitter()

const io_logger = (error, stdout, stderr) => {
    if(error){console.error('WORKER:', error)}
    if(stdout){console.log('WORKER:', stdout)}
    if(stderr){console.error('WORKER:', stderr)}
}


function initConnection(device, ws){
    config.set(['local', 'Devices', device, 'ws'], ws)
    
    ws.on('message', (message, isBinary) => {
        if(!isBinary){  //only handle string messages
            const packet = JSON.parse(message)
            if(packet.type && packet.data){ wsmanager.update.emit(packet.type, packet.data, device) }
            else{ console.error(`Websocket(${device}): package is missing type or data`) }
        }
        else { console.error(`Websocket(${device}): received binary data, expected string`) }
    })
    ws.on('error', (e) => console.error(e))
    ws.on('close', (code, reason) => {
        //TODO: change device activity state
        console.log(`${device} connection closed - ${code}:${reason}`)
    })
}

const connect = (d) => {
    const port = config.get(['config', 'User', 'WebsocketPort'])
    const token = crypto.randomUUID().split('-').shift()    //generate unique connection ID

    //define new connection listener
    const listener = (device) => wsmanager.update.once(token, (ws) => initConnection(device, ws))
    listener(d) //create new listener

    //set token to expire
    setTimeout(() => {
        if(!config.get(['local', 'Devices', d, 'ws'])){
            //if connection hasn't been made before timeout, set device back to inactive
            config.set(['local', 'Devices', d, 'Active'], false)
        }
        //remove listener(in case it was never used)
        wsmanager.update.removeListener(token, listener)
    }, token_timeout)

    if(isDev()){
        //worker needs port and token as params
        exec(`npm run worker worker=true route=${port + '/' + token}`, (...args) => io_logger(...args))
    }
    else{ console.error('wsmanager.mjs - Worker spawning not set up for production') }
}

const disconnect = (d) => {
    config.get(['local', 'Devices', d, 'ws'])?.close(1000)
    config.delete(['local', 'Devices', d, 'ws'])
}

wsmanager.start = () => {
    const wsport = config.get(['config', 'User', 'WebsocketPort'])
    if(typeof wsport === 'number'){
        wss = new WebSocketServer({
            port: wsport, 
            perMessageDeflate: false, 
        })
        
        wss.on('connection', (ws, req) => {
            const token = req.url.split('/').at(-1) //get connection token
            wsmanager.update.emit(token, ws)    //emit new connection event
        })
        wss.on('close', (ws) => {/* ??? */})
        wss.on('listening', () => console.log(`WSS listening at port ${wsport}`))
        wss.on('error', (err) => console.error('WSS error: ', err))
    }
    else{
        console.error('Error starting WSS - no port defined')
    }
}

wsmanager.stop = (msg = '') => {
    //todo?: kill all active connections
    //1001	Going Away
    //1006	Abnormal Closure
    //1012	Service Restart
    wss.close(() => console.log('WSS closed:', msg))
}

//TODO: assing package.type API
wsmanager.update.on('logmessage', (msg, source) => console.log(source + ':' + msg))
wsmanager.update.on('logerror', (err, source) => console.error(source + ':' + err))


//if websocket port changes, restart server
config.update.on('WebsocketPort', (path, value) => {
    //TODO: reconnect all devices
    wsmanager.stop(`config changed, restarting`)
    wsmanager.start()
})

config.update.on('Active', (path, value) => {
    value ? connect(path.at(-2)) : disconnect(path.at(-2))
})