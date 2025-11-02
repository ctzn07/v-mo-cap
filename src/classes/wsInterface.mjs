import EventEmitter from 'node:events'

class wsInterfaceEmitter extends EventEmitter {}

export class WsInterface {
    constructor(websocket) {
        this.emitter = new wsInterfaceEmitter()
        this.ws = websocket
        this.packetId = 0
        this.ws.on('message', (data, isBinary) => this.receive(data, isBinary))
    }

    decode(arr){ return arr.map(n => String.fromCharCode(n)).join('') }

    receive(payload, isBinary){
        const packet = {}
        try{
            if(isBinary){
                Object.assign(packet, JSON.parse(this.decode(packet)))
            }
            else{
                Object.assign(packet, JSON.parse(payload.data))
            }
        }
        catch(error){ packet.error = error }

        //if packet has id, emit on response channel, else on regular channel
        if(packet.id){ this.emitter.emit(`response-${packet.id}`, packet) }
        else{ this.emitter.emit(`receive`, packet) }
    }
    
    updateId(){ this.packetId = this.packetId < 256 ? this.packetId++ : 1 }

    send(data, isRequest = false){
        const packet = {}

        if(isRequest){ packet.id = this.packetId }
        packet.data = data

        this.ws.send(JSON.stringify(packet))
    }

    request(path){
        updateId()
        this.send(path, true)

        return new Promise((resolve, reject) => {
            const res = `response-${this.packetId}`
            
            const timer = setTimeout(() => {
                this.emitter.removeAllListeners(res)
                reject({error: 'Request timed out'})
            }, 3000)

            this.emitter.once(res, (packet) => {
                clearTimeout(timer)
                resolve(packet)
            })
        })
    } 
}