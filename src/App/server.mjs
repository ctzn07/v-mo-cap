import http from 'node:http'
import crypto from 'crypto'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { websocketInterface } from '../classes/websocket.mjs'

export const server = new EventEmitter()

const netserver = http.createServer({}, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('V-Mo-Cap server.\n')
})

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
netserver.on('connect', (req, socket, head) => { /*console.log('server "connection" event')*/ })

//https://nodejs.org/api/http.html#event-connection
netserver.on('connection', (socket) => {
    const websocket = new websocketInterface(socket)
    /*
    Events:
    ('close', code, reason)
    ('partial', data, fin)
    ('message', data, isBinary)
    ('error', code, reason)
    Methods:
    send(data)          //data will be sent as text if typeof data === 'string', binary otherwise
    on(event, callback) //register event callback
    off(event)          //remove event callback
    close(code, reason) //close connection, arguments are optional
    */
   //broadcast new socket to listeners
    server.emit('connect', websocket)
    websocket.on('partial', (data, fin) => websocket.close(1002, 'Server does not support fragmented data'))
    websocket.on('close', (code, reason) => { server.emit('disconnect', websocket, code, reason) })
    websocket.on('error', (code, reason) => console.error(`netserver websocket error(${code}) - ${reason}`))
})

netserver.on('request', (req, res) => { /*console.log('server "request" event')*/ })

netserver.on('dropRequest', (req, socket) => { /*console.log('server "dropRequest" event')*/ })

//https://nodejs.org/api/http.html#event-upgrade_1
netserver.on('upgrade', (req, socket, head) => {
    //get necessary info from update request
    const { route, params } = getRouteInfo(req)
    //console.log(JSON.stringify(params, null, 4))

    if(!authCheck(route, params)){ return } //not authorized, let request timeout(should probably return proper unauth response)
    
    console.log(`New Websocket client with route:${route}, params:${JSON.stringify(params)}`)

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