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
    //if(error){console.error('WORKER:', error)}
    //if(stdout){console.log('WORKER:', stdout)}
    //if(stderr){console.error('WORKER:', stderr)}
}



function runWorker(token){
    const port = config.get(['config', 'User', 'WebsocketPort'])
    if(isDev()){
        exec(`npm run worker worker=true route=${port + '/' + token}`, (...args) => io_logger(...args))
    }
    else{ console.error('wsmanager.mjs - Worker spawning not set up for production') }
}

//wsmanager.update.eventNames()

const websocketListener = (device) => { 
    const token = crypto.randomUUID()
    //set token to expire
    setTimeout(() => { wsmanager.update.removeAllListeners(token) }, token_timeout)

    //Create listener
    wsmanager.update.on(`${device}//disconnect`, ()=> { wsmanager.update.removeAllListeners(token) })

    //consume token when WSS emits ('connect')
    wsmanager.update.once(token, (ws) => {
        console.log(`${device} websocket connected`)
        wsmanager.update.removeAllListeners(device)

        //register outgoing events
        ws.on('message', (...args) => { wsmanager.update.emit(`${device}//message`, ...args) })
        ws.on('error', (...args) => { wsmanager.update.emit(`${device}//error`, ...args) })
        ws.on('close', (...args) => { wsmanager.update.emit(`${device}//close`, ...args) })

        wsmanager.update.on(`${device}//send`, (packet) => { ws.send(JSON.stringify(packet)) })
        wsmanager.update.on(`${device}//disconnect`, (reason) => { ws.close(1000, reason) })
    })
    //finally create worker process
    runWorker(token)
}

//TODO: clean up event listeners for dead connections


const connect = (device) => {
    websocketListener(device) //create new listener
    wsmanager.update.on(`${device}//message`, (...args) => console.log(JSON.parse(...args)))
}

const disconnect = (device) => {
    wsmanager.update.emit(`${device}//disconnect`, 'user disconnected')
    wsmanager.update.removeAllListeners(device)
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
            //check if token has listener
            if(wsmanager.update.eventNames().includes(token)){ 
                wsmanager.update.emit(token, ws)    //listener exists, emit new connection event
            }
            else{
                ws.close(3000, '401 - Unauthorized')  //no listener found, close the connection
            }
        })
        wss.on('close', (ws) => { console.log('WSS server connection closed')})
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

//TODO: assing package.type API (emits are type-channel, data, device-source)
//wsmanager.update.on('logmessage', (msg, source) => console.log(source + ':' + msg))
//wsmanager.update.on('logerror', (err, source) => console.error(source + ':' + err))


//if websocket port changes, restart server
config.update.on('WebsocketPort', (path, value) => {
    //TODO: reconnect all devices
    wsmanager.stop(`config changed, restarting`)
    wsmanager.start()
})

config.update.on('Active', (path, value) => {
    value ? connect(path.at(-2)) : disconnect(path.at(-2))
})