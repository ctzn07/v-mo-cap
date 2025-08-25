//electron script for App main GUI
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { gui } from './gui.mjs'
import { tracker } from './trackers.mjs'

import { isDev, platform } from '../common/util.mjs'

import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

//helper function to send data to UI
function updateUI(channel, data = null){
  if(gui[channel]){ ipcRender.emit(channel, gui[channel](data)) }
  else{ console.error(`Cannot call UI update on channel ${channel}`) }
}

function createGUI(){
  const win = new BrowserWindow({
    width: 1200,
    height: 1000,
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
  ipcRender.on('devices', (data) => win.webContents.send('devices', data))
  ipcRender.on('config', (data) => win.webContents.send('config', data))
  ipcRender.on('preview', (data) => win.webContents.send('preview', data))

  //config manager update events(channels correspond each config.json branch)
  config.update.on('Devices', (path) => updateUI('devices'))
  config.update.on('Tracking', (path) => updateUI('config'))
  config.update.on('User', (path) => updateUI('config'))
  config.update.on('Active', (path, value) => tracker.toggle(path[1], value))
  
  //Events for receiving data from UI
  ipcMain.on('devicelist', (e, list) => updateUI('devices', list))
  //ipcMain.on('connect', (e, device) => tracker.toggle(device))
  ipcMain.on('setconfig', (e, path, value) => config.set(path, value))
  //generic UI update request
  ipcMain.on('update', (e, channel) => updateUI(channel))

  //Data requests events from UI
  ipcMain.handle('getconfig', (e, path) => { return config.get(path) })

  //Utility events
  ipcMain.on('logmessage', (e, msg) => { console.log(msg) })
  ipcMain.on('logerror', (e, msg) => { console.error(msg) })
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