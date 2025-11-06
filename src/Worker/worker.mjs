//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import fs from 'node:fs'
import { WebSocket } from 'ws'
import { isDev, platform } from '../common/util.mjs'
import { WorkerInterface } from '../classes/wsInterface.mjs'
import path from 'path'

const root_path = path.join(app.getAppPath(), (isDev() ? '' : '../'))
const config_path = path.join(root_path, './config.json')

function quit(code){
    if(platform() !== 'darwin')app.quit(code)
    app.exit(code)
}

function createGUI(){
    const win = new BrowserWindow({
        width: 800, 
        height: 800, 
        webPreferences: {
        //todo: check is path right for production
        preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
        sandbox: false,   //preloading .mjs is not compatible with sandboxing
        }, 
        autoHideMenuBar: true, 
        //show: isDev(), 
        show: true, 
        title: `VMC Worker()`, 
    })
    //todo: check is path right for production
    const htmlpath = path.join(app.getAppPath() + '/dist/worker.html')
    win.loadFile(htmlpath)
    if(isDev()){ win.webContents.openDevTools() }

    //page has finished loading
    win.webContents.on('did-finish-load', () => {
        //connect to main process using websocket
        if(fs.existsSync(config_path)){
            const config = JSON.parse(fs.readFileSync(config_path, { encoding: 'utf-8', JSON: true }))

            const ws = new WebSocket(`ws://localhost:${config.User.WebsocketPort}/worker`, {perMessageDeflate: false})
            const wsHandler = new WorkerInterface(ws)
            wsHandler.on('close', (c, r) => quit(0))
            wsHandler.on('error', (e) => ws.close(1011, e))
            wsHandler.on('ping', (data) => {
                return new Error('out of pongs')
                //return 'pong'
            })
            wsHandler.on('disconnect', (data) => { app.quit() })
        }
        else{
            console.log('Worker cant read config file')
            quit(1)
        }
    })
}

export default function initWorker(args){
    app.on('ready', () => createGUI(args))
    app.on('window-all-closed', () => quit())
}