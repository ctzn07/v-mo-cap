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
        this.heartbeat = setInterval(() => {}, 10000)
        this.apiMap = new Map()

        //Handle socket events. 
        socket.on('data', (c) => this.#data(c))
        //'close' event is emitted when the stream and any of its underlying resources (a file descriptor, for example) have been closed.
        socket.on('close', () => { console.log('socket closed') })
        //'end' event is emitted when there is no more data to be consumed from the stream.(basically upon disconnection)
        socket.on('end', () => { /*client has disconnected*/ })
        socket.on('error', (err) => {  })

    }
    on(api, callback){ this.apiMap.set(api, callback) }

    off(api){ this.apiMap.delete(api) }

    send(data){

    }

    #error(message){
        if(this.apiMap.has('error'))this.apiMap.get('error')(message)
        //any error occurring in this class is severe enough to warrant client disconnection
        //TODO: kill connection and emit close
    }

    #emit(api, ...args){ if(this.apiMap.has(api))this.apiMap?.get(api)(...args) }

    #dataReceived(){
        //TODO? create a copy of the packet before emitting it?
        switch (this.opcode) {
            case OPCODES.CONTINUATION:  //received partial data
                console.log('socket received partial packet')
                break
                
            case OPCODES.TEXT:          //received text data
                console.log('socket received text:')
                this.#emit('message', this.buffer.toString('utf8'), false)
                break
            
            case OPCODES.BINARY:        //received binary data
                console.log('socket received binary')
                this.#emit('message', this.buffer.toString('utf8'), true)
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
                //Spec mandates unknown opcodes must close the connection
                this.#emit('error', 'Invalid opcode')
                break
        }
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
                    this.#error(error)
                    this.buffering = false
                    break
                }
            }
        }

        //buffer has all the expected data, do callback
        if(this.bufferIndex === this.buffer.length){
            clearTimeout(this.timeout)
            this.buffering = false
            //this.onCompleteCB({fin: this.fin, op: this.opcode, data: this.buffer})
            this.#dataReceived()
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
            this.#error('Unknown opcode')
            this.buffering = false
            return
        }

        const bitSizeCheck = () => {
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
        const length = size < 126 ? size : size === 126 ? data.readUInt16BE(2) : bitSizeCheck()

        //if length is less than size, payload size was not read right(above 32bit integer range)
        if(length < size){
            this.#error('Payload too large')
            this.buffering = false
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
    #data(chunk){ this.buffer ? this.#write(chunk) : this.#newpacket(chunk) }
}