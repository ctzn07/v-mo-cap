import { exec, spawn } from 'child_process'
import { console } from '../common/logger.mjs'
import { isDev, platform } from '../common/util.mjs'

export class Worker {
    #websocket
    #token = crypto.randomUUID().split('-').at(-1)
    constructor(device, emitter) {
        this.device = device
        this.emitter = emitter
        //new websocket connection events listener for this device token
        this.emitter.on(this.#token, (ws) => {
            this.#websocket = ws
            this.#websocket.on('message', (...args) => this.receive(...args))
            this.#websocket.on('error', (...args) => this.error(...args))
            this.#websocket.on('close', (...args) => this.close(...args))
        })
        //create event listener for each method
        /*
        for(const m of Object.getOwnPropertyNames(Worker.prototype)){
            this.emitter.on(`worker/${this.device}/${m}`, (...args) => this[m](...args))  
        }*/
    
    }

    terminate(reason = 'Worker terminated'){
        //worker is permanently closed
        console.log(`Worker.terminate: ${reason} - ${this.device}`)
        
        //remove event listener for each method
        /*
        for(const m of Object.getOwnPropertyNames(Worker.prototype)){
            this.emitter.removeAllListeners(`worker/${this.device}/${m}`)  
        }*/

        //close websocket
        this.disconnect(reason)

        //remove token listener
        this.emitter.removeAllListeners(this.#token)

        //delete all class members(garbage collection)
        for(const m of Object.getOwnPropertyNames(Worker.prototype)){ delete this[m] }
        delete this.device
        delete this.emitter
        this.#websocket = null
        this.#token = null
    }

    connect(ws){
        console.log(`Worker.connect() - ${this.device}`)
        //TODO: check if ws is already connected
        this.#websocket = ws
        
    }

    disconnect(reason){
        if(this.#websocket && this.#websocket.readyState === WebSocket.OPEN){
            this.#websocket.close(1000, reason)
        }
    }

    reconnect(newPort){
        //TODO: send worker new port to connect to
        //terminate websocket connection
    }

    start(port){
        console.log(`Worker.start(${port}) - ${this.device}`)
        if(isDev()){
            exec(`npm run worker worker="true" port="${port}" token="${this.#token}"`, (...args) => this.io_callback(...args))
        }
        else{
            this.error('Worker spawning not set up for production')
            //TODO: terminate worker
        }
    }

    io_callback(error, stdout, stderr){
        if(error || stderr)console.error(`${this.device} : ${error || ''}, ${stderr || ''}`)
        if(stdout)console.log(`${this.device} : ${stdout || ''}`)
    }

    receive(data, isBinary){
        console.log(`Worker.receive() - ${this.device}`)
        if(!isBinary){
            console.log(JSON.parse(data))
        }
        else this.error(`${this.device} received binary data`)
    }

    error(e){
        console.error(`Worker.error: ${e || '-'} - ${this.device}`)
    }
}