//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import { isDev, platform } from '../common/util.mjs'
import { WsInterface } from '../classes/wsInterface.mjs'
import path from 'path'

function quit(code){
    if(platform() !== 'darwin')app.quit(code)
    app.exit(code)
}

function connectWS(args){
    //connect to main process using websocket(no, wss is not supported)
    const ws = new WebSocket(`ws://localhost:${args.port}/${args.token}`, {perMessageDeflate: false})
    ws.on('open', () => {
        const wsi = new WsInterface(ws)
        wsi.on('disconnect', () => quit())
        wsi.on('close', () => quit())
        
        wsi.request('register-worker', args.token)
        setInterval(() => {
            wsi.request('console.log', 'ping')
        }, 1000);
    })
    
}

function createGUI(args){
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
        title: `VMC Worker(${args.device})`, 
    })
    //todo: check is path right for production
    const htmlpath = path.join(app.getAppPath() + '/dist/worker.html')
    win.loadFile(htmlpath)
    if(isDev()){ win.webContents.openDevTools() }

    //page has finished loading
    win.webContents.on('did-finish-load', () => {})
}

export default function initWorker(args){
    app.on('ready', () => createGUI(args))
    connectWS(args)
    app.on('window-all-closed', () => quit())
}