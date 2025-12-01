const OPCODES = {
    CONTINUATION: 0x00,
    TEXT:         0x01,
    BINARY:       0x02,
    CLOSE:        0x08,
    PING:         0x09,
    PONG:         0x0A
}

export class websocketInterface{
    constructor(socket){
        this.buffering = false
        this.rsv = []
        this.fin = null
        this.opcode = null
        this.isMasked = null
        this.maskingKey = null
        this.buffer = null
        this.bufferIndex = 0
        this.timeout = null
        this.heartbeat = setInterval(() => {
            if(!this.buffering)this.#parse(OPCODES.PING)    //only send pings when not writing to buffer
            if(Date.now() - this.timestamp > 10000){        //over 10 seconds since last update, kill connection
                this.#error(1000, 'Connection timed out')
            }    
        }, 2000)
        this.apiMap = new Map()
        this.socket = socket
        this.timestamp = Date.now()
        this.closeSent = false
        this.code = 1000
        this.reason = ''

        //Handle socket events. 
        socket.on('data', (c) => this.#data(c))
        //'close' event is emitted when the stream and any of its underlying resources (a file descriptor, for example) have been closed.
        socket.on('close', () => {
            console.log('socket.close -> cleanup()')
            this.#cleanup()
        })
        //'end' event is emitted when there is no more data to be consumed from the stream.(basically upon disconnection)
        socket.on('end', () => {
            console.log('socket.end -> closeConnection()')
            if(!this.closeSent)this.#closeConnection(this.code, this.reason)
        })
        socket.on('error', (err) => { this.#error(1011, err) })

    }

    #bitSizeCheck(data){
        const dataView = new DataView(data.buffer)
        const high = dataView.getUint32(2)  // Read the first 4 bytes (high part)
        const low = dataView.getUint32(6)  // Read the next 4 bytes (low part)

        // Combine high and low parts to form the full 64-bit length
        const fullLength = (BigInt(high) << 32n) | BigInt(low)

        // Return 0 if the lenght exceeds the 32-bit range, otherwise return 32-bit value
        return (fullLength > 0xFFFFFFFFn) ? 0 : Number(fullLength & 0xFFFFFFFFn)
    }

    #emit(api, ...args){ if(this.apiMap.has(api))this.apiMap?.get(api)(...args) }

    #cleanup(){
        clearInterval(this.heartbeat)
        clearTimeout(this.timeout)
        //this.socket.end()
        this.socket.destroy()
    }

    #closeConnection(code, reason){
        console.log('close connection called', code, reason)
        //send closing handshake once
        if(!this.closeSent){
            this.code = this.code ? this.code : code
            this.reason = this.reason ? this.reason : reason

            const payload = Buffer.alloc(2 + reason.length)
            payload.writeInt16BE(this.code)
            for (let i = 0; i < this.reason.length; i++) { payload.writeUInt8(this.reason[i], i + 2) }

            this.#parse(OPCODES.CLOSE, payload)
            this.closeSent = true

            this.timeout = setTimeout(() => { this.#cleanup() }, 1000)
        }
    }

    #error(code, message){
        this.code = code
        this.reason = message
        if(this.apiMap.has('error'))this.apiMap.get('error')({error: message, code: code})
        //any error occurring in this class is severe enough to warrant client disconnection
        //this.#closeConnection(code, message, '#error')
        this.socket.end()
    }

    on(api, callback){ this.apiMap.set(api, callback) }

    off(api){ this.apiMap.delete(api) }

    #parse(opcode, data, isFinal = true){
        if(this.closeSent)return     //no more data transmits after close frame has been sent

        const databuf = Buffer.from(data || '')
        const size = databuf.length

        //determine frame byte size
        const frameSize = size < 126 ? 2 + size : size < 127 ? 4 + size : 10 + size

        const frame = Buffer.alloc(frameSize)
        //frame[0] = opcode
        const FIN = isFinal ? 0x80 : 0x00
        frame[0] = FIN | opcode

        switch (true) {
            case (size <= 126):
                frame[1] = size     //8-bit length, offset 2 bytes
                databuf.copy(frame, 2)
                break
            case (size <= 65535):
                frame[1] = 126      //16-bit length, offset 4 bytes
                frame.writeUInt16BE(size, 2)
                databuf.copy(frame, 4)
                break
        
            default:
                frame[1] = 127      //64-bit length, offset 10 bytes
                frame.writeUInt32BE(0, 2)
                frame.writeUInt32BE(size, 6)
                databuf.copy(frame, 10)
                break
        }
        this.socket.write(frame)
    }

    send(data){
        //FIN + type of data is string ? textFrame : binaryFrame
        const opcode = typeof data === 'string' ? OPCODES.TEXT : OPCODES.BINARY
        this.#parse(opcode, data)
    }

    #received(){
        //create a copy of the packet before emitting it
        const buffercopy = Buffer.from(this.buffer)
        this.timestamp = Date.now()

        switch (this.opcode) {
            case OPCODES.CONTINUATION:  //received partial data
                console.log('socket received partial packet')
                break
                
            case OPCODES.TEXT:          //received text data
                console.log('socket received text:')
                this.#emit('message', buffercopy.toString('utf8'), false)
                break
            
            case OPCODES.BINARY:        //received binary data
                console.log('socket received binary')
                this.#emit('message', buffercopy, true)
                break
        
            case OPCODES.CLOSE:         //received closing handshake from client
                const code = buffercopy.length > 1 ? buffercopy.readUInt16BE(0) : 1005
                const reason = buffercopy.length > 2 ? buffercopy.toString('utf8', 2) : ''
                this.#closeConnection(code, reason)
                break

            case OPCODES.PING:          //received ping, send pong
                console.log('socket received ping')
                this.#parse(OPCODES.PONG, buffercopy)
                break

            case OPCODES.PONG:          //received pong, update alive status          
                console.log('socket received pong')
                //no action required, any incoming packet will refresh the timestamp
                break

            default:
                //Spec mandates unknown opcodes must close the connection
                this.#error(1002, 'Protocol error(opcode)')
                break
        }
        this.buffering = false
    }

    #write(data){
        if(this.isMasked && this.maskingKey){
            //unmask data to buffer
            for (let i = 0; i < data.length; i++){
                try {
                    this.buffer.writeUInt8(data[i] ^ this.maskingKey[this.bufferIndex % 4], this.bufferIndex)
                    this.bufferIndex++
                }
                catch (error) {
                    this.#error(1011, 'Data write error')
                    //console.error(error)
                    console.error('data:', data.length, ' - ', this.bufferIndex, '/', this.buffer.length)
                    break
                }
            }
        }

        //buffer has all the expected data, do callback
        if(this.bufferIndex === this.buffer.length){
            this.#received()
        }
    }

    #newpacket(data){
        this.buffering = true
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
            this.#error(1002, 'Protocol error(opcode)')
            return
        }

        //read data size
        const size = data[1] & 0x7f
        const length = size < 126 ? size : size === 126 ? data.readUInt16BE(2) : this.#bitSizeCheck(data)

        //if length is less than size, payload size was not read right(above 32bit integer range)
        if(length < size){
            this.#error(1009, 'Payload too large')
            return
        }

        //determine masking key starting index
        const keyByteIndex = size < 126 ? 2 : size < 127 ? 4 : 10
        this.maskingKey = null
        this.maskingKey = data.slice(keyByteIndex, keyByteIndex + 4)

        //reset & allocate buffer
        this.bufferIndex = 0
        this.buffer = null
        //TODO: double-check which allocation method should be used https://nodejs.org/api/buffer.html#class-buffer
        this.buffer = Buffer.alloc(length)

        //start reading payload after masking key
        //keyByteIndex + length of the masking key(4bytes)
        this.#write(data.slice(keyByteIndex + 4))
    }

    //NOTE: data will arrive in 65536 byte chunks.
    #data(chunk){ this.buffering ? this.#write(chunk) : this.#newpacket(chunk) }
}

/*
CODES

1000 - normal closure
1001 - going away
1002 - protocol error
1003 - endpoint cannot handle this type of data
1004 - 
1005 - default code when no closure code was provided
1006 - connection closed without closing handshake
1007 - data type mismatch(example: received binary in text package // or encoding was not utf8)
1008 - message policy violation
1009 - message too large
1010 - (client only)extension negotiation failure (server would simply reject websocket upgrade if it does not agree)
1011 - unexpected error(server only)
1015 - TLS Handshake failure
*/