//electron script for App main GUI
import { app, BrowserWindow, ipcMain } from 'electron'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { isDev, platform } from '../common/util.mjs'

import path from 'path'

function createWindow(){
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
  return win
}

ipcMain.on('devicelist', (e, list) => {
  //fetch device information from config manager based on device label
  const data = {devices: list.map(d => config.device(d.label) )}
  BrowserWindow.fromId(e.frameId).webContents.send('update', data)
}) 

ipcMain.on('logmessage', (e, msg) => console.log(msg))
ipcMain.on('logerror', (e, msg) => console.error(msg))
ipcMain.on('setconfig', (e, update) => config.set(update))
ipcMain.handle('getconfig', (e, path) => { return config.get(path) })

//initialization script
export default function initApp(args){
  console.log('App initialized')
  console.log('Arguments:', args)
  createWindow()
  //ws.startServer(config.get(['user', 'tracker_port']))
}

app.on('ready', () => {}) //this does not trigger

app.on('window-all-closed', () => {
  //ws.stopServer()
  if (platform() !== 'darwin') app.quit()
  //app.exit()
  //process.exit(1)
})