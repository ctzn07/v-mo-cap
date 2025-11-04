import EventEmitter from 'node:events'

class wsInterfaceEmitter extends EventEmitter {}

export class WsInterface {
    constructor(websocket) {
        this.emitter = new wsInterfaceEmitter()
        this.ws = websocket
        this.ws.on('message', (data, isBinary) => this.receive(data, isBinary))
        this.ws.on('error', (e) => this.emitter.emit('error', e))
        this.ws.on('close', (code, reason) => this.emitter.emit('close', `${code}-${reason}`))
    }
    //client.readyState === WebSocket.OPEN
    decode(arr){ return arr.map(n => String.fromCharCode(n)).join('') }

    receive(payload, isBinary){
        const packet = {}
        try{
            if(isBinary){ Object.assign(packet, JSON.parse(this.decode(packet))) }
            else{ Object.assign(packet, JSON.parse(payload.data)) }
        }
        catch(e){ packet.error = e }

        this.emitter.emit(`${packet.id}`, packet) 
    }

    request(path, o_data){
        //create unique request id
        const identifier = crypto.randomUUID().split('-').at(-1)

        //create packet
        const packet = {
            id: identifier, 
            api: path, 
            data: o_data || null
        }

        const promise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.emitter.removeAllListeners(identifier)
                reject('Request timed out')
            }, 3000)

            this.emitter.once(identifier, (package) => {
                clearTimeout(timer)
                
                if(package.error){
                    //there is an error, reject
                    reject(package.error)
                }
                else{
                    //otherwise, resolve
                    resolve(package)
                }
            })
        })
        
        if(this.ws && this.ws.readyState === WebSocket.OPEN){
            //if websocket is open, stringify and send packet
            try { this.ws.send(JSON.stringify(packet)) }
            catch(e) {
                clearTimeout(promise.timer)
                this.emitter.removeAllListeners(identifier)
                promise.reject(e)
            }
        }
        else{
            //else, reject and clean up
            clearTimeout(promise.timer)
            this.emitter.removeAllListeners(identifier)
            promise.reject('WsInterface is not connected')
        }
        return promise
    }
}