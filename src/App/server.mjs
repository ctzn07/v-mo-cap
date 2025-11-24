import http from 'node:http'
import crypto from 'crypto'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'

export const server = new EventEmitter()

const serverOptions = {
    connectionsCheckingInterval: 30000, 
    headersTimeout: 60000, 
    insecureHTTPParser: false, 
    joinDuplicateHeaders: false, 
    keepAlive: false, 
    keepAliveInitialDelay: 0, 
    keepAliveTimeout: 5000, 
    maxHeaderSize: 16384, //(16 KiB)
    maxRequestsPerSocket: 0, 
    noDelay: true, 
    requestTimeout: 300000, 
    requireHostHeader: true, 
    rejectNonStandardBodyWrites: false, 
    optimizeEmptyRequests: false, 
}

const netserver = http.createServer(serverOptions, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('V-Mo-Cap server.\n')
})

server.address = () => {
    if(!netserver.listening)return null
    //todo: return null if server is not on
    else return netserver.address().family === 'IPv6' ? `[${netserver.address().address}]:${netserver.address().port}` : `${netserver.address().address}:${netserver.address().port}`
}

netserver.on('listening', () => { console.log(`V-Mo-Cap server running (${server.address()})`) })

netserver.on('clientError', (err, socket) => {
    console.error(`Client error: ${err.message}\n`, err.stack)
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

netserver.on('close', () => { console.log(`V-Mo-Cap server stopped`) })

netserver.on('connect', (req, socket, head) => { /*do stuff with plain html requests?*/ })

netserver.on('request', (req, res) => { /*do stuff with plain html requests?*/ })

netserver.on('dropRequest', (req, socket) => { /*when server.maxRequestsPerSocket is reached, this event will be triggered*/ })

function newConnection(socket){
    console.log('New Connection!1!')
    socket.isAlive = true
    const ttl = setInterval(() => {
        if(!socket.isAlive){
            //no alive status updates since last ping -> assume connection dead
            clearInterval(ttl)
            //closeSocket(socket)
        }
        else{
            //flag connection and send ping
            socket.isAlive = false
            //sendControlFrame(socket, 0x9)
        }
    }, 10000)
    //TODO: new event emitter for each connection
    //Create a WebSocket binds
    //socket.on('data', () => {})
    //socket.on('end', () => {})
    //socket.on('error', (e) => {  })
    //socket.on('close', () => {  })
}

//https://nodejs.org/api/http.html#event-upgrade_1
netserver.on('upgrade', (req, socket, head) => {
    const key = req.headers['sec-websocket-key']
    //SHA-1 hashes the result, update key is defined by the WebSocket RFC, Base64-encodes it
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')

    socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        `\r\n`)
    
    //handle newly upgraded connection
    newConnection(socket)
})

server.start = () => {
    const port = config.get('config/User/WebsocketPort')
    try { netserver.listen(port) } 
    catch (error) { console.error(error) }
}

server.stop = (code = 1001, reason = '') => {
    //todo: close all websockets with given code and reason
    try { netserver.close((e) => { if(e)console.error(e) }) }
    catch (error) { console.error(error) }
}

//if server port changes, restart server
config.update.on('config/User/WebsocketPort', (port) => {
    server.stop(1012, 'Server port changed, restarting...')
    server.start(port)
})

//1001	Going Away
//1006	Abnormal Closure
//1012	Service Restart