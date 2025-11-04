import EventEmitter from 'node:events'
import { Logger } from '../classes/logfile.mjs'

class wsInterfaceEmitter extends EventEmitter {}

//const identifier = crypto.randomUUID().split('-').at(-1)

//const console = new Logger(`./wsInterface${identifier}.log`)
const console = new Logger(`./wsInterface.log`)

export class WorkerInterface {
    constructor(websocket) {
        this.emitter = new wsInterfaceEmitter()
        this.ws = websocket
        this.ws.on('message', (data, isBinary) => this.#receive(data, isBinary))
        this.api = new Map()
    }
    
    register(api, callback){
        console.log(`${api} registered`)
        this.api.set(api, callback)
    }

    unregister(api){
        console.log(`${api} unregistered`)
        this.api.delete(api)
    }

    #decodeData(arr){ return arr.map(n => String.fromCharCode(n)).join('') }
    
    #handleRequest(packet){
        console.log(`handling request ${JSON.stringify(packet)}`)
        const response = {
            id: packet.id,  
            isRequest: false, 
            api: packet.api, 
        }

        //check if api endpoint is registered, fill in the data
        if(this.api.has(packet.api)){
            response.data = this.api.get(packet.api)(packet.data)
        }
        //api is not registered, return error
        else{
            response.error = `${packet.api} is not registered with endpoint`
        }
        //try sending response
        try {
            console.log(`sending response ${JSON.stringify(response)}`)
            this.ws.send(JSON.stringify(response))
        }
        catch(e) { this.emitter.emit('error', e) }
    }

    
    #receive(payload, isBinary){
        const packet = {}
        console.log('got package', payload)
        //TODO: check was the actual data in payload.data
        //TODO: add boolean option to exclude data from being decoded


        try{    //Attempt to parse the incoming data
            if(isBinary){ Object.assign(packet, JSON.parse(this.#decodeData(payload))) }
            else{  Object.assign(packet, JSON.parse(payload)) }

            if(packet.isRequest){ this.#handleRequest(packet) }
            else{ this.emitter.emit(`${packet.id}`, packet) }
        }
        catch(e){   //data parsing failed
            console.log(e)
        }
    }
    
    request(api_path, o_data = null, timeout = 3000){
        
        return new Promise((resolve, reject) => {
            //create unique request id
            const requestId = crypto.randomUUID().split('-').at(-1)

            //set request to expire
            const timer = setTimeout(() => {
                this.emitter.removeAllListeners(requestId)
                reject('Request timed out')
            }, timeout)

            //set up listener for request response
            this.emitter.once(requestId, (packet) => {
                clearTimeout(timer)
                if(packet.error){ reject(packet.error) }  //if there was an error, reject  
                else{ resolve(packet) }    //else, resolve
            })

            //create packet
            const packet = {
                id: requestId, 
                isRequest: true, 
                api: api_path, 
                data: o_data
            }
            console.log(`sending request ${JSON.stringify(packet)}`)

            //stringify and send packet
            try { this.ws.send(JSON.stringify(packet)) }
            catch(e) {
                clearTimeout(timer)
                this.emitter.removeAllListeners(requestId)
                setTimeout(() => { reject(e) }, 100)
            }
        })
    }
}