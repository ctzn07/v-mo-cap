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

const netserver = http.createServer({}, (req, res) => {
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

netserver.on('connect', (req, socket, head) => { console.log('server "connect" event') })

netserver.on('request', (req, res) => { console.log('server "request" event') })

netserver.on('dropRequest', (req, socket) => { console.log('server "dropRequest" event') })

const OPCODES = {
    CONTINUATION: 0x00,
    TEXT:         0x01,
    BINARY:       0x02,
    CLOSE:        0x08,
    PING:         0x09,
    PONG:         0x0A
}

function extract(buffer) {
    // --- 1. Parse Header ---
    let offset = 2
    const firstByte = buffer[0]
    const secondByte = buffer[1]

    const fin = (firstByte & 0x80) !== 0
    const opcode = firstByte & 0x0f
    const isMasked = (secondByte & 0x80) === 0x80
    
    // --- 2. Determine Payload Length ---
    let payloadLength = secondByte & 0x7f
    
    if (payloadLength === 126) {
        payloadLength = buffer.readUInt16BE(offset)
        offset += 2
    } else if (payloadLength === 127) {
        payloadLength = buffer.readUInt32BE(offset + 4)
        offset += 8
    }

    //opcode is "close" so payload doesn't need to be handled, or should it?
    if (opcode === OPCODES.CLOSE) return { fin, opcode, payload: null }

    // --- 4. Extract & Unmask Data ---
    let maskingKey
    if (isMasked) {
        maskingKey = buffer.slice(offset, offset + 4)
        offset += 4
    }

    let data = buffer.slice(offset, offset + payloadLength)

    if (isMasked && maskingKey) {
        for (let i = 0; i < data.length; i++) { data[i] ^= maskingKey[i % 4] }
    }

    //if opcode is text, convert data to string, otherwise pass the binary
    const payload = (opcode === OPCODES.TEXT) ? data.toString('utf8') : data

    return { fin, opcode, payload }
}

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

//https://nodejs.org/api/http.html#event-upgrade_1
netserver.on('upgrade', (req, socket, head) => {

    //get necessary info from update request
    const { route, params } = getRouteInfo(req)

    if(!authCheck(route, params)){
        //not authorized, let request timeout
        return
    }

    //TODO: check if route is authorized, and if it requires token from params
    console.log(JSON.stringify(params, null, 4))
    

    const key = req.headers['sec-websocket-key']
    const websocketkey = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    //SHA-1 hashes the result, update key is defined by the WebSocket RFC, Base64-encodes it
    const accept = crypto.createHash('sha1').update(key + websocketkey).digest('base64')

    socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        `\r\n`
    )
    
    //Socket is upgraded, handle events
    socket.on('data', (data) => {
        const { fin, opcode, payload } = extract(data)
        switch (opcode) {
            case OPCODES.CONTINUATION:
                //received partial data
                console.log('socket received partial packet')
                break
            
            case OPCODES.TEXT:
                //received text data
                console.log('socket received text:', payload)
                break
            
            case OPCODES.BINARY:
                //received binary data
                console.log('socket received binary')
                break
        
            case OPCODES.CLOSE:
                //received closing handshake from client, destroy socket
                console.log('socket received close handshake')
                break

            case OPCODES.PING:
                //received ping, send pong
                console.log('socket received ping')
                break

            case OPCODES.PONG:
                //received pong, update alive status
                console.log('socket received pong')
                break

            default:
                //opcode is garbage, throw error
                break
        }
    })

    socket.on('close', () => console.log('socket closed'))

    socket.on('end', () => console.log('socket end'))

    socket.on('error', (err) => console.error('socket error:', err))
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