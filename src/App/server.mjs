import http from 'node:http'
import crypto from 'crypto'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { websocketInterface } from '../classes/websocket.mjs'
import { Buffer } from 'node:buffer'

export const server = new EventEmitter()

const netserver = http.createServer({}, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('V-Mo-Cap server.\n')
})

server.address = () => {
    if(!netserver.listening)return null
    else return netserver.address().family === 'IPv6' ? `[${netserver.address().address}]:${netserver.address().port}` : `${netserver.address().address}:${netserver.address().port}`
}

netserver.on('listening', () => { console.log(`V-Mo-Cap server running (${server.address()})`) })

//https://nodejs.org/api/http.html#event-clienterror
netserver.on('clientError', (err, socket) => {
    //TODO? not sure does this event also occur with upgraded connections
    console.error(`Client error: ${err.message}\n`, err.stack)
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

netserver.on('close', () => {
    //TODO: send closing handshake to all websockets
    netserver.closeAllConnections()
    console.log(`V-Mo-Cap server stopped`)
    server.emit('close')
})

//https://nodejs.org/api/http.html#event-connect_1
netserver.on('connect', (req, socket, head) => { console.log('server "connect" event') })

//https://nodejs.org/api/http.html#event-connection
netserver.on('connection', (socket) => { console.log('server "connection" event') })

netserver.on('request', (req, res) => { console.log('server "request" event') })

netserver.on('dropRequest', (req, socket) => { console.log('server "dropRequest" event') })


function getRouteInfo(req){
    const url = new URL('ws://' + server.address() + req.url)
    const route = url.pathname.split('/').filter(a => a).join('/')
    const params = {}
    //extract all search params to object
    for (const [key, value] of url.searchParams) { params[key] = value }
    return { route, params }
}

function authCheck(route, params){
    //TODO: add way to register valid tokens for worker route
    //TODO: also set up route registration/authentication for plugins later
    return true
}

const stressTest = () => {
    const charray = ['A', 'B', 'C'] 
    const randomdata = []
    const datacount = Math.floor(1024*1024*12)
    for(var i = 0; i < datacount; ++i){
        randomdata.push(charray[Math.floor(Math.random() * charray.length)])
    }

    return randomdata.join('')
}

//https://nodejs.org/api/http.html#event-upgrade_1
netserver.on('upgrade', (req, socket, head) => {
    //get necessary info from update request
    const { route, params } = getRouteInfo(req)
    //console.log(JSON.stringify(params, null, 4))

    if(!authCheck(route, params)){ return } //not authorized, let request timeout(should probably return proper unauth response)

    //Create emitter to interact with socket
    const ws = new EventEmitter()

    const websocket = new websocketInterface(socket)

    websocket.on('error', (e) => console.error(e))

    //broadcast new socket to listeners
    server.emit('connect', ws)

    setTimeout(() => {
        const asd = Buffer.from(stressTest())
        console.log('sending:', typeof asd)
        websocket.send(asd)
    }, 3000);

    const key = req.headers['sec-websocket-key']
    const websocketkey = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

    //SHA-1 hashes the result, update key is defined by the WebSocket RFC, Base64-encodes it
    const accept = crypto.createHash('sha1').update(key + websocketkey).digest('base64')

    //everything is set up, send response to client about upgrade acceptance
    socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` + 
        `Upgrade: websocket\r\n` + 
        `Connection: Upgrade\r\n` + 
        `Sec-WebSocket-Accept: ${accept}\r\n` + 
        `\r\n`)
})

server.start = () => {
    const port = config.get('config/User/WebsocketPort')
    try { netserver.listen(port) } 
    catch (error) { console.error(error) }
}

server.stop = (code = 1001, reason = '') => {
    //todo: close all websockets with given code and reason
    try { netserver.close() }
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

/**
function extract(buffer) {
    // --- Header ---
    const fin = (buffer[0] & 0x80) !== 0
    const opcode = buffer[0] & 0x0f
    const isMasked = (buffer[1] & 0x80) === 0x80
    const size = buffer[1] & 0x7f
    // --- Payload Length ---

    //const payloadLength = size < 126 ? size : size === 126 ? buffer.readUInt16BE(2) : buffer.readUInt32BE(2)

    console.log('payload size:', buffer.length)

    // --- Extract & Unmask Data ---
    //if length < 126, key is indexes 2-6, < 65535 in indexes 4-8, past that indexes 10-14
    //const keyByteIndex = payloadLength < 126 ? 2 : payloadLength < 65535 ? 4 : 10
    //const keyByteIndex = payloadLength > 65535 ? 10 : payloadLength > 125 ? 4 : 2

    const keyByteIndex = size < 126 ? 2 : size < 127 ? 4 : 10
    const maskingKey = buffer.slice(keyByteIndex, keyByteIndex + 4)

    //everything past masking key is payload data
    const data = buffer.slice(keyByteIndex + 4, buffer.length)

    if (isMasked && maskingKey) {
        for (let i = 0; i < data.length; i++) { data[i] ^= maskingKey[i % 4] }
    }

    //if opcode is text, convert data to string, otherwise pass the binary
    const payload = (opcode === OPCODES.TEXT) ? data.toString('utf8') : data

    return { fin, opcode, payload }
}
*/


/**
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
 */