//electron script for App main GUI
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { isDev, platform } from '../common/util.mjs'

import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

const devices = []
const trackers = new Map()
//helper function to send data to UI
function updateUI(channel, data){ ipcRender.emit(channel, data) }

function updateDevices(list){ //receives a device list in browser format
  const deviceDataTemplate = (c) => {
    //formats the device config data for UI
    return {
      label: c.label, 
      id: c.deviceId, 
      active: trackers.has(c.label), //does device have active connection
      modules: c.modules, 
      performance: {
        fps: 0, //todo: make system that monitors performance
        errors: 0, //todo: make system that monitors tracking errors
      }
    }
  }
  
  if(list){
    //if list argument was provided, clear the existing data
    devices.length = 0

    //for each device in list, fetch config data for it, then format it for UI
    for(const d of list){ devices.push(deviceDataTemplate(config.device(d.label)))}
  }
  else{
    //no list argument provided, refresh existing list
    for(const [i, d] of devices.entries()){  
      devices[i] = deviceDataTemplate(config.device(d.label)) 
      //console.log('index', i, d.label, d.active)
    }
  }
  console.log('current trackers:', ...trackers.keys())
  updateUI('device', devices)
}

function trackerConnect(device){
  //console.log('connect: ', device)
  const connect = (d) => {
    console.log('creating tracker for ', d.label)
    //TODO: create new tracker instance
    trackers.set(d.label, 'INSERT WS CONNECTION HERE')
  }
  const disconnect = (d) => {
    //TODO: bind this function to ws disconnection event
    console.log('disconnecting tracker for ', d.label)
    trackers.delete(d.label)
  }
  trackers.has(device.label) ? disconnect(device) : connect(device)
  updateDevices() //device update is ran here for UI responsivenes
}

function createGUI(){
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      //todo: check is path right for production
      preload: path.join(app.getAppPath() + '/src/App/api.mjs'),
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
  ipcRender.on('device', (data) => win.webContents.send('device', data))
  ipcRender.on('config', (data) => win.webContents.send('config', data))
  ipcRender.on('preview', (data) => win.webContents.send('preview', data))

  //Events for receiving data from UI
  ipcMain.on('devicelist', (e, list) => { updateDevices(list) })
  ipcMain.on('connect', (e, device) => trackerConnect(device))
  ipcMain.on('setconfig', (e, path, value) => console.log('setconfig: ', value, path))

  //Data requests events from UI
  ipcMain.handle('getconfig', (e, path) => { return config.get(path) })

  //Utility events
  ipcMain.on('logmessage', (e, msg) => console.log(msg))
  ipcMain.on('logerror', (e, msg) => console.error(msg))
}


//initialization script
export default function initApp(args){
  console.log('App initialized with arguments:', args)
  //TODO: Start websocket server for trackers
  createGUI()
}

app.on('ready', () => {}) //this does not trigger

app.on('window-all-closed', () => {
  //TODO: Stop tracker websocket server
  if (platform() !== 'darwin') app.quit()
  //app.exit()
  //process.exit(1)
})