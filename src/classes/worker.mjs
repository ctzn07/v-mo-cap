import { exec, spawn } from 'child_process'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { isDev, platform } from '../common/util.mjs'

export class Worker {
    #ws

    constructor(device) {
        this.device = device
        this.token = crypto.randomUUID().split('-').at(-1)
        this.#runProcess()
    }

    #runProcess(){
        //open child process
        const port = config.get('config/User/WebsocketPort')
        if(isDev()){
            //exec(`npm run worker worker="true" port="${port}" token="${this.token}"`)//, (error, stdout, stderr) => {}
            exec(`npm run worker worker="true"`)
        }
        else{ console.error('Worker process spawning not set up for production') }
    }

    #isConnected() { return this.#ws && this.#ws.readyState === WebSocket.OPEN }

    newConnection(websocket){
        console.log(`${this.token} connected`)

        if(!this.#isConnected()) {
            this.#ws = websocket
            this.#ws.on('message', (data, isBinary) => {
                if(!isBinary){ this.receive(data) }
                else{ console.error(`${this.token} received binary data`)  }
            })
            this.#ws.on('error', (e) => console.error(`${this.token}.error: ${e}`))
            this.#ws.on('close', (code, reason) => {
                console.log(`${this.token} disconnected: (${code})${reason}`)
                //connection closed but device is still active -> create new process
                if(config.get('session/Devices/Connected').includes(this.device)){ 
                    setTimeout(() => this.#runProcess(), 2000)
                }
            })
        }
        else{
            console.error(`${this.token} - Unknown connection rejected`)
            websocket.close(3000, '401 - Unauthorized')
        }
    }

    receive(data) {
        //TODO: create emitter for the worker
        //console.log(`${this.token}.receive() : ${data}`) 
    }

    terminate(code, reason) {
        //worker is permanently closed
        //console.log(`${this.token} terminated`)
        this.#ws.close(code, reason)
        //delete all class members(garbage collection)
        setTimeout(() => {
            for(const m of Object.getOwnPropertyNames(Worker.prototype)){ delete this[m] }
            delete this.device
            delete this.token
            this.#ws = null
        }, 1000);
    }
}

//create event listener for each method
/*
for(const m of Object.getOwnPropertyNames(Worker.prototype)){
    this.emitter.on(`worker/${this.device}/${m}`, (...args) => this[m](...args))  
}*/

//remove event listener for each method
/*
for(const m of Object.getOwnPropertyNames(Worker.prototype)){
    this.emitter.removeAllListeners(`worker/${this.device}/${m}`)  
}*/