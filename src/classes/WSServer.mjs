import http from 'http'
import crypto from 'crypto'

export class WebSocketServer {
    constructor(port = 8080) {
        this.port = port
        //this.server = http.createServer(httpOptions, (req, res) => {
        this.server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('WebSocket server is running.\n')
        })

        // Handle WebSocket upgrade requests
        this.server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head))

        //Keep track of connected clients (TCP sockets)
        this.clients = new Set()

        // Optional: periodically send ping frames to clients
        this.pingInterval = 10000
    }

    parseFrame(buffer) {
        const firstByte = buffer[0]
        const secondByte = buffer[1]
        const fin = (firstByte & 0x80) !== 0
        const opcode = firstByte & 0x0f

        let payload = null
        
        //opcode is "close" so payload doesn't need to be handled
        //note: or should it?
        if (opcode === 0x8) return { fin, opcode, payload }
        
        const isMasked = (secondByte & 0x80) === 0x80
        let payloadLength = secondByte & 0x7f
        let offset = 2

        if (payloadLength === 126) {
            payloadLength = buffer.readUInt16BE(offset)
            offset += 2
        } else if (payloadLength === 127) {
            payloadLength = buffer.readUInt32BE(offset + 4)
            offset += 8
        }

        let maskingKey
        if (isMasked) {
            maskingKey = buffer.slice(offset, offset + 4)
            offset += 4
        }

        let data = buffer.slice(offset, offset + payloadLength)

        if (isMasked && maskingKey) {
            data = data.map((byte, i) => byte ^ maskingKey[i % 4])
            //note: according to google for-each is faster than .map()...
            /* or
            for (let i = 0; i < data.length; i++) {
                data[i] ^= maskingKey[i % 4];
            }
            */
        }

        //if opcode is text, convert data to string, otherwise pass the binary
        payload = (opcode === 0x1) ? data.toString('utf8') : data

        return { fin, opcode, payload }
    }

    send(socket, message) {
        const messageBuffer = Buffer.from(message)
        const messageLength = messageBuffer.length

        let frame

        if (messageLength <= 125) {
            //| 0x81 | length | payload... |
            // Case 1: Short message (payload <= 125)
            frame = Buffer.alloc(2 + messageLength)
            frame[0] = 0x81; // FIN + text frame
            frame[1] = messageLength // no mask, just length
            messageBuffer.copy(frame, 2)

        } else if (messageLength <= 65535) {
            //| 0x81 | 126 | [len_hi] | [len_lo] | payload... |
            // Case 2: Medium message (payload <= 65535 → use 16-bit length)
            frame = Buffer.alloc(4 + messageLength)
            frame[0] = 0x81; // FIN + text frame
            frame[1] = 126; // 126 indicates next 2 bytes = length
            frame.writeUInt16BE(messageLength, 2) // write 16-bit big-endian length
            messageBuffer.copy(frame, 4)

        } else {
            //| 0x81 | 127 | [0,0,0,0] | [len_bytes_4] | payload... |
            // Case 3: Large message (payload > 65535 → use 64-bit length)
            frame = Buffer.alloc(10 + messageLength)
            frame[0] = 0x81; // FIN + text frame
            frame[1] = 127; // 127 indicates next 8 bytes = length

            // Write 64-bit length (Big Endian)
            // Since JS can't handle 64-bit integers directly, write as two 32-bit chunks
            frame.writeUInt32BE(0, 2); // high 32 bits (we’ll assume messages < 4GB)
            frame.writeUInt32BE(messageLength, 6) // low 32 bits
            messageBuffer.copy(frame, 10)
        }

        socket.write(frame);
    }

    sendBinary(socket, buffer) {
        const length = buffer.length
        let frame

        if (length <= 125) {
            frame = Buffer.alloc(2 + length)
            frame[0] = 0x82; // FIN + binary opcode
            frame[1] = length
            buffer.copy(frame, 2)
        } else if (length <= 65535) {
            frame = Buffer.alloc(4 + length)
            frame[0] = 0x82
            frame[1] = 126
            frame.writeUInt16BE(length, 2)
            buffer.copy(frame, 4)
        } else {
            frame = Buffer.alloc(10 + length)
            frame[0] = 0x82
            frame[1] = 127
            frame.writeUInt32BE(0, 2)
            frame.writeUInt32BE(length, 6)
            buffer.copy(frame, 10)
        }

        socket.write(frame)
    }

    // Send control frame (ping/pong)
    sendControlFrame(socket, opcode, payload = '') {
        const payloadBuffer = Buffer.from(payload)
        const length = payloadBuffer.length
        const frame = Buffer.alloc(2 + length)

        frame[0] = 0x80 | opcode // FIN + control opcode
        frame[1] = length // no mask for server→client
        payloadBuffer.copy(frame, 2)

        socket.write(frame)
    }
    //ping client:
    //this.sendControlFrame(client, 0x9)

    onData(socket, buffer){
        //TODO: clear existing ping timeout and create a new one

        const { fin, opcode, payload } = this.parseFrame(buffer)

        if (!opcode) return

        if(!fin){ /*the buffer is a fragment*/ }

        switch (opcode) {
            case 0x0:   //fragmented frame
                //TODO: add payload into fragment buffer
                break

            case 0x1: // text frame
                //Received payload
                //TODO: emit received data
                break

            case 0x2: // binary frame
                //Received binary data
                //TODO: emit received data
                break

            case 0x8: // close frame
                //Client closed connection
                socket.end()
                
                this.clients.delete(socket)
                break

            case 0x9: // ping frame
                //Received ping → sending pong
                this.sendControlFrame(socket, 0xA, payload)
                break

            case 0xA: // pong frame
                //Received pong
                //nothing to do, as any data traffic will refresh sockets isAlive status
                break
        }
    }

    closeSocket(socket){
        //TODO: check how to cleanly shutdown TCP socket
        socket.end()
        //socket.destroy()
        this.clients.delete(socket)
    }

    //https://nodejs.org/api/net.html#class-netsocket
    handleConnection(socket) {
        //New client connected
        this.clients.add(socket)

        //check connection health on regular intervals
        const ttl = setInterval(() => {
            if(!socket.isAlive){
                //no alive status updates since last ping -> assume connection dead
                clearInterval(ttl)
                this.closeSocket(socket)
            }
            else{
                //flag connection and send ping
                socket.isAlive = false
                this.sendControlFrame(socket, 0x9)
            }
        }, this.pingInterval)

        socket.on('data', (buffer) => {
            //Client sent data(thus connection must be alive)
            socket.isAlive = true
            this.onData(socket, buffer)
        })

        socket.on('close', () => {
            //Client disconnected
            this.clients.delete(socket)
        })

        socket.on('end', () => {
            //Connection ended
            this.clients.delete(socket)
        })

        socket.on('error', () => {
            //Client errored out
            this.clients.delete(socket)
        })
    }

    generateAcceptValue(secWebSocketKey) {
        //Concatenates the client key with the magic string
        return crypto
            .createHash('sha1') //SHA-1 hashes the result
            .update(secWebSocketKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64')   //Base64-encodes it
        //"258EAFA5-E914-47DA-95CA-C5AB0DC85B11" (defined by the WebSocket RFC)
    }

    handleUpgrade(req, socket, head) {
        const key = req.headers['sec-websocket-key']
        if (!key) {
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
            socket.destroy()
            return
        }

        const acceptKey = this.generateAcceptValue(key)

        const responseHeaders = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`
        ]

        socket.write(responseHeaders.join('\r\n') + '\r\n\r\n')

        this.handleConnection(socket)
    }
    
    start() {
        this.server.listen(this.port, () => { console.log(`WebSocket server running at ws://localhost:${this.port}`) })
    }

    stop() {
        //TODO? send something to this.clients?
        this.server.close()
    }
}


/*
send(socket, message) {
    const messageBuffer = Buffer.from(message)
    //Every WebSocket frame starts with at least 2 header bytes, followed by the payload.
    const frame = Buffer.alloc(2 + messageBuffer.length)

    //Set the first byte (FIN + opcode)
    frame[0] = 0x81; // FIN + text frame opcode

    //The second byte’s highest bit (0x80) indicates masking.
    //For client → server frames, this bit is always 1.
    //For server → client frames, it must be 0 (no masking).
    //The remaining 7 bits represent the payload length (if ≤125).
    //If the payload is longer than 125 bytes, the format changes — you’d need to add extra bytes for length (16-bit or 64-bit).
    
    frame[1] = messageBuffer.length // payload length
    //Copy the payload data
    messageBuffer.copy(frame, 2)

    socket.write(frame)
}

//https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
const httpOptions = {
    connectionsCheckingInterval: 30000, 
    headersTimeout: 60000, 
    insecureHTTPParser: false, 
    joinDuplicateHeaders: false, 
    keepAlive: false, 
    keepAliveInitialDelay: 0, 
    keepAliveTimeout: 5000, 
    maxHeaderSize: 16384, 
    noDelay: true, 
    requestTimeout: 300000, 
    requireHostHeader: true, 
    rejectNonStandardBodyWrites: false, 
    optimizeEmptyRequests: false, 
}
*/