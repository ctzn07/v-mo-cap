//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import fs from 'node:fs'
import { WebSocket } from 'ws'
import { isDev, platform } from '../common/util.mjs'
import path from 'path'

const worker = {}

//websocket module event emitter
class Wmitter extends EventEmitter {}
worker.update = new Wmitter()

const wsPromise = (api, data) => {
    let timeout
    //unique identifier for this promise
    const key = crypto.randomUUID()
    return new Promise((resolve, reject) => {
        worker.update.once(key, (data) => {
            clearTimeout(timeout)
            resolve(data)
        })
        timeout = setTimeout(() => {
            reject(new Error(`Data request on ${api} timed out`))
            worker.update.removeAllListeners(key)
        }, 1000)
    })
}

function quit(){
    if(platform() !== 'darwin')app.quit()
    app.exit(0)
}

function wsReceive(data, isBinary){
    if(!isBinary){
        console.log('worker received ', data)
    }
    else console.error('Worker received binary data, discarding...')
}

function createGUI(params){
    const win = new BrowserWindow({
        width: 800, 
        height: 800, 
        webPreferences: {
        //todo: check is path right for production
        preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
        sandbox: false,   //preloading .mjs is not compatible with sandboxing
        }, 
        autoHideMenuBar: true, 
        show: isDev(), 
        title: `VMC Worker(${params.token})`, 
    })
    //todo: check is path right for production
    const htmlpath = path.join(app.getAppPath() + '/dist/worker.html')
    win.loadFile(htmlpath)
    if(isDev()){ win.webContents.openDevTools() }

    //page has finished loading
    win.webContents.on('did-finish-load', () => {
        //connect to main process using websocket
        worker.ws = new WebSocket(`ws://localhost:${params.port}/${params.token}`, {perMessageDeflate: false})
        worker.ws.on('open', () => {
            worker.ws.send('this is a test package')
        })
        worker.ws.on('message', (data, isBinary) => { wsReceive(data, isBinary) })

        //on error/connection loss -> app quit
        worker.ws.on('error', (e) => { console.log(e); quit() })
        worker.ws.on('close', () => { quit() })
    })
}

//const send = (channel, packet) => worker.ws.send(JSON.stringify({api: channel, data: packet}))
//const request = (path) => worker.ws.send(JSON.stringify({api: 'request', data: path}))

export default function initWorker(args){
    app.on('ready', () => { createGUI(args) })
    app.on('window-all-closed', () => { quit() })
}