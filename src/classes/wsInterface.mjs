export class WorkerInterface {
    constructor(websocket) {
        this.ws = websocket
        this.ws.on('message', (data, isBinary) => this.#receive(data, isBinary))
        this.buffer = new Map()
        this.apiMap = new Map()
    }
    
    register(api, callback){ this.apiMap.set(api, callback) }

    unregister(api){ this.apiMap.delete(api) }

    #decodeData(arr){ return arr.map(n => String.fromCharCode(n)).join('') }
    
    #handleRequest(packet){
        const response = {
            id: packet.id,  
            isRequest: false, 
            api: packet.api, 
        }

        //check if api endpoint is registered, fill in the data
        if(this.apiMap.has(packet.api)){ response.data = this.apiMap.get(packet.api)(packet.data) }
        //api is not registered, return error
        else{ response.error = `${packet.api} is not registered with endpoint` }
        //try sending response
        try { this.ws.send(JSON.stringify(response)) }
        catch(e) { /*how should endpoint handle network errors?*/ }
    }
    
    #receive(payload, isBinary){
        const packet = {}

        try{    //Attempt to parse the incoming data
            if(isBinary){ Object.assign(packet, JSON.parse(this.#decodeData(payload))) }
            else{ Object.assign(packet, JSON.parse(payload)) }

            if(packet.isRequest){ this.#handleRequest(packet) }
            else{ this.buffer.get(packet.id)(packet) }
        }
        catch(e){   //data parsing failed
            packet.error = e
        }
    }
    
    request(api_path, o_data = null, timeout = 3000){
        
        return new Promise((resolve, reject) => {
            //create unique request id
            const requestId = crypto.randomUUID().split('-').at(-1)

            const timer = setTimeout(() => {
                this.buffer.delete(requestId)
                reject('Request timed out')
            }, timeout)

            //construct listener
            this.buffer.set(requestId, (packet) => {
                clearTimeout(timer)
                if(packet.error){ reject(packet.error) }
                else{ resolve(packet.data) }
                this.buffer.delete(requestId)
            })

            //create packet
            const packet = {
                id: requestId, 
                isRequest: true, 
                api: api_path, 
                data: o_data
            }

            //stringify and send packet
            try { this.ws.send(JSON.stringify(packet)) }
            catch(e) {
                clearTimeout(timer)
                this.buffer.delete(requestId)
                setTimeout(() => { reject(e) }, 100)
            }
        })
    }
}