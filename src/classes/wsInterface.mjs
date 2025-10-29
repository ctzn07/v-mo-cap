import EventEmitter from 'node:events'

class wsInterfaceEmitter extends EventEmitter {}

export class WsInterface {
    constructor(websocket) {
        this.emitter = new wsInterfaceEmitter()
        this.ws = websocket
        this.packetId = 0
        this.ws.on('message', (data) => {
            const packet = JSON.parse(data)
            this.emitter.emit(`${packet.type}-${packet.id}`, packet)
        })
    }
    
    newId(){
        this.packetId = this.packetId < 256 ? this.packetId++ : 0 
        return this.packetId
    }

    send(data, type = 'send', id = 0){
        const packet = JSON.stringify({
                type: type, 
                id: id, 
                data: data, 
        })
        this.ws.send(packet)
    }

    request(path){
        const requestId = this.newId()

        this.send(path, 'request', requestId)

        return new Promise((resolve, reject) => {
            const identifier = `response-${requestId}`
            
            const timer = setTimeout(() => {
                this.emitter.removeAllListeners(identifier)
                reject()
            }, 3000)

            this.emitter.once(identifier, (data) => {
                clearTimeout(timer)
                resolve(data)
            })
        })
    }
    
}