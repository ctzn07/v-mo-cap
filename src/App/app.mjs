//electron script for App main GUI
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { server } from './server.mjs'
import { sourceManager } from './sources.mjs'

import { isDev, platform, shortID } from '../common/util.mjs'

import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

function createGUI(){
    const win = new BrowserWindow({
        width: 1000,
        height: 900, 
        minWidth: 500, 
        minHeight: 500, 
        webPreferences: {
            //todo: check is path right for production
            preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
            sandbox: false,   //preloading .mjs is not compatible with sandboxing
        },
        autoHideMenuBar: true,
    })

    //todo: check is path right for production
    const htmlpath = path.join(app.getAppPath() + '/dist/app.html')
    win.loadFile(htmlpath)
    console.log('New BrowserWindow: ', htmlpath)

    if(isDev())win.webContents.openDevTools()

    //following config manager events trigger UI page updates
    config.update.on('session/Sources', () => win.webContents.send('sources'))
    config.update.on('config/Devices', () => win.webContents.send('sources'))
    config.update.on('config/User', () => win.webContents.send('config'))
    
    //Events for receiving data from UI
    ipcMain.on('setconfig', (e, path, value) => config.set(path, value))
    ipcMain.on('update', (e, channel) => console.log(`UI update requested on ${channel}`)) //generic UI update request
    
    ipcMain.on('addSource', (e) => sourceManager.createSource())
    ipcMain.on('removeSource', (e, id) => sourceManager.removeSource(id))
    //ipcMain.on('addSource', (e) => console.log('addSource was called'))
    ipcMain.on('devicelist', (e, list) => config.set('session/Devices/Connected', list))

    //Data requests events from UI
    ipcMain.handle('get', (e, path) => { return config.get(path) })

    //Utility events
    ipcMain.on('log', (e, msg) => { console.log(msg) })
    ipcMain.on('error', (e, msg) => { console.error(msg) })

    //Server events
    server.on('connect', (websocket, route, params) => {
        switch (route) {
            case sourceManager.sourcePath:
                //sourceManager.registerSource(params)
                break;
        
            default:
                break;
        }
         //client connected->create sourceAPI for source manager
         
         //console.log('app.mjs: new client connection')
    })
    server.on('disconnect', (ws) => {
        //client disconnected
        //console.log('app.mjs: client disconnection')
    })
    
}

//initialization script
export default function initApp(args){
    console.log('app.mjs startup arguments:', JSON.stringify(args))

    app.on('ready', () => {
        createGUI()
        server.start()
    })

    app.on('window-all-closed', () => {
        app.quit()
        //if (platform() !== 'darwin') app.quit()
        //setTimeout(() => { app.exit(0) }, 1000)
    })

    app.on('before-quit', () => {
        server.stop(1001, 'Application closing')
    })
}

/**
function manageDevices(list){
    clearTimeout(timer)
    timer = setTimeout(() => {
        config.devicelist(list) //make sure devices have config entries
        const newList = new Set(list)
        const oldList = new Set(Object.keys(config.get('session/Devices') || {}))

        for(const device of oldList){
            if(!newList.has(device)){
                //new device list no longer has entry -> set inactive & delete
                config.set(`session/Devices/${device}/Active`, false)
                config.delete(`session/Devices/${device}`)
            }
        }
        for(const device of newList){
            if(!oldList.has(device)){
                //device has no entry, create new
                const template = { 
                    Active: false, 
                }
                config.set(`session/Devices/${device}`, template)
            }
        }
    }, 500)
}
 */