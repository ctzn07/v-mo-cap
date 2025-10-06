//electron script for App main GUI
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { gui } from './gui.mjs'
import { wsmanager } from './wsmanager.mjs'

import { isDev, platform } from '../common/util.mjs'

import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

//helper function to send data to UI
function updateUI(channel, data = null){
    if(gui[channel]){ ipcRender.emit(channel, gui[channel](data)) }
    else{ console.error(`Cannot call UI update on channel ${channel}`) }
}

function updateDevices(list){
    config.devicelist(list)     //special function that makes sure all devices have config entry
    const devicesObj = config.get('session/Devices') || {}
    const newList = new Set(list)
    const oldList = new Set(Object.keys(devicesObj))

    for(const device of newList.union(oldList)){
        if(devicesObj[device] && devicesObj[device].Available === true){
            if(!newList.has(device)){ config.set(`session/Devices/${device}/Available`, false) }
        }else{
            if(newList.has(device)){ config.set(`session/Devices/${device}/Available`, true) }
        }
    }
}

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
    
    //Events for sending data to UI
    ipcRender.on('devices', (data) => win.webContents.send('devices', data))
    ipcRender.on('config', (data) => win.webContents.send('config', data))
    ipcRender.on('preview', (data) => win.webContents.send('preview', data))

    //config manager update events(channels correspond each config.json branch)
    config.update.on('session/Devices', () => updateUI('devices'))
    config.update.on('config/Devices', () => updateUI('devices'))
    config.update.on('config/Tracking', () => updateUI('config'))
    config.update.on('config/User', () => updateUI('config'))
    
    //Events for receiving data from UI
    ipcMain.on('devicelist', (e, list) => updateDevices(list))
    ipcMain.on('setconfig', (e, path, value) => config.set(path, value))
    ipcMain.on('update', (e, channel) => updateUI(channel)) //generic UI update request

    //Data requests events from UI
    //ipcMain.handle('getconfig', (e, path) => { return config.get(path) })

    //Utility events
    ipcMain.on('logmessage', (e, msg) => { console.log(msg) })
    ipcMain.on('logerror', (e, msg) => { console.error(msg) })
}

//initialization script
export default function initApp(args){
    console.log('App initialized with arguments:', args)
    wsmanager.start()
    app.on('ready', () => createGUI())
}

app.on('window-all-closed', () => {
    wsmanager.stop('application closing')
    if (platform() !== 'darwin') app.quit()
    app.exit(1)
})
