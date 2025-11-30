import http from 'node:http'
import crypto from 'crypto'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
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

const OPCODES = {
    CONTINUATION: 0x00,
    TEXT:         0x01,
    BINARY:       0x02,
    CLOSE:        0x08,
    PING:         0x09,
    PONG:         0x0A
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

function newDataManager(socket, onComplete, onError){   
    socket.packet = {
        active: false, 
        rsv: [], 
        fin: null, 
        opcode: null, 
        isMasked: null, 
        maskingKey: null, 
        //TODO: double-check which allocation method should be used https://nodejs.org/api/buffer.html#class-buffer
        buffer: null,  
        bufferIndex: 0, 
        onCompleteCB: onComplete, 
        onErrorCB: onError, 

        write(data){
            if(this.isMasked && this.maskingKey){
                //unmask data to buffer
                for (let i = 0; i < data.length; i++){
                    try {
                        this.buffer.writeUInt8(data[i] ^ this.maskingKey[this.bufferIndex % 4], this.bufferIndex)
                        this.bufferIndex++
                    }
                    catch (error) {
                        this.onErrorCB(error)
                        this.active = false
                        break
                    }
                }
            }

            //buffer has all the expected data, do callback
            if(this.bufferIndex === this.buffer.length){
                this.onCompleteCB({fin: this.fin, op: this.opcode, data: this.buffer})
                this.active = false
            }
        }, 

        new(data){
            this.active = true
            // Extract the RSV1, RSV2, and RSV3 bits by shifting and masking
            this.rsv.length = 0
            this.rsv[0] = (data[0] >> 7) & 1  // Bit 7 (highest bit)
            this.rsv[1] = (data[0] >> 6) & 1  // Bit 6
            this.rsv[2] = (data[0] >> 5) & 1  // Bit 5
            //NOTE: even if RSV1 bit is enabled(perMessageDeflate), the extension data isn't included in the payload
            //TODO: reject packets with RSV2 & 3, as this is not spec compliant server

            this.fin = null
            this.fin = (data[0] & 0x80) !== 0
            this.opcode = null
            this.opcode = data[0] & 0x0f
            this.isMasked = null
            this.isMasked = (data[1] & 0x80) === 0x80

            if(!Object.values(OPCODES).includes(this.opcode)){
                this.onErrorCB('Unknown OPCODE')
                this.active = false
                return
            }

            const dataLengthCheck = () => {
                const dataView = new DataView(data.buffer)
                const high = dataView.getUint32(2)  // Read the first 4 bytes (high part)
                const low = dataView.getUint32(6)  // Read the next 4 bytes (low part)

                // Combine high and low parts to form the full 64-bit length
                const fullLength = (BigInt(high) << 32n) | BigInt(low)

                // Return 0 if the lenght exceeds the 32-bit range, otherwise return 32-bit value
                return (fullLength > 0xFFFFFFFFn) ? 0 : Number(fullLength & 0xFFFFFFFFn)
            }

            //read data size
            const size = data[1] & 0x7f
            const length = size < 126 ? size : size === 126 ? data.readUInt16BE(2) : dataLengthCheck()

            //if length is less than size, payload size was not read right(above 32bit integer range)
            if(length < size){
                this.onErrorCB('Payload too large')
                this.active = false
                return
            }
            //determine masking key starting index
            const keyByteIndex = size < 126 ? 2 : size < 127 ? 4 : 10
            this.maskingKey = null
            this.maskingKey = data.slice(keyByteIndex, keyByteIndex + 4)

            //(reset and)allocate buffer
            this.bufferIndex = 0
            this.buffer = null
            this.buffer = Buffer.alloc(length)  

            //start reading payload after masking key
            //keyByteIndex + length of the masking key(4bytes)
            this.write(data.slice(keyByteIndex + 4))
        }, 

        data(chunk){ this.active ? this.write(chunk) : this.new(chunk) },
    }
}



//https://nodejs.org/api/http.html#event-upgrade_1
netserver.on('upgrade', (req, socket, head) => {
    //get necessary info from update request
    const { route, params } = getRouteInfo(req)
    //console.log(JSON.stringify(params, null, 4))

    if(!authCheck(route, params)){ return } //not authorized, let request timeout(should probably return proper unauth response)

    //Create emitter to interact with socket
    const ws = new EventEmitter()

    const dataComplete = (packet) => {
        //{fin: this.fin, op: this.opcode, data: this.buffer}
        console.log('completed', packet.fin, packet.op, packet.data.length)
    }
    const dataError = (err) => {
        //socket data errors are severe enough to warrant disconnecting the client
        //TODO: kill connection
        console.error(err)
    }

    newDataManager(socket,  dataComplete, dataError)
    //Handle socket events. 
    //NOTE: data will arrive in 65536 byte chunks.
    socket.on('data', (data) => socket.packet.data(data))

    //'close' event is emitted when the stream and any of its underlying resources (a file descriptor, for example) have been closed.
    socket.on('close', () => { console.log('socket closed') })

    //'end' event is emitted when there is no more data to be consumed from the stream.(basically upon disconnection)
    socket.on('end', (code, reason) => {
        //todo: remove socket from client list
        server.emit('disconnect', ws)
    })

    socket.on('error', (err) => {
        ws.emit('error', err)
        //todo: close socket and remove socket from client list
    })

    //broadcast new socket to listeners
    server.emit('connect', ws)

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

/*
    function handleOP(fin, opcode, payload){
        //const { fin, opcode, payload } = extract(data)
        switch (packet.op) {
                        case OPCODES.CONTINUATION:  //received partial data
                            console.log('socket received partial packet')
                            break
                        
                        case OPCODES.TEXT:          //received text data
                            console.log('socket received text:')
                            break
                        
                        case OPCODES.BINARY:        //received binary data
                            console.log('socket received binary')
                            break
                    
                        case OPCODES.CLOSE:         //received closing handshake from client
                            //const code = payload.readUInt16BE(0) || 1005
                            //const reason = payload.toString('utf8', 2) || ''
                            console.log('socket received close handshake with code:reason')
                            //socket.end()
                            break

                        case OPCODES.PING:          //received ping, send pong
                            console.log('socket received ping')
                            break

                        case OPCODES.PONG:          //received pong, update alive status          
                            console.log('socket received pong')
                            break

                        default:
                            //TODO: spec mandates unknown opcodes must close the connection
                            break
                    }
                }) 
            }
    }
    */


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