//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { WebSocket } from 'ws'
import { isDev, platform } from '../common/util.mjs'
import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

//helper for sending data to worker front-end
function sendData(channel, data){ ipcRender.emit(channel, data) }

function createGUI(data){
  const config = data
  const win = new BrowserWindow({
    width: 800, 
    height: 400, 
    webPreferences: {
      //todo: check is path right for production
      preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
      sandbox: false,   //preloading .mjs is not compatible with sandboxing
    }, 
    autoHideMenuBar: true, 
    show: isDev(), 
    title: `VMC Worker(${config.device})`, 
  })
  //todo: check is path right for production
  const htmlpath = path.join(app.getAppPath() + '/dist/worker.html')
  win.loadFile(htmlpath)
  if(isDev()){ win.webContents.openDevTools() }

  //TODO
  //check config data
  //connect websocket
  //do websocket bindings to corresponding events
  //close window/exit application when websocket connection closes

  //Events for sending data to worker front-end
  ipcRender.on('channel', (data) => win.webContents.send('channel', data))

  //Events for receiving data from worker front-end
  ipcMain.on('channel', (e, data) => {})

  //Event for handling data requests from worker front-end
  ipcMain.handle('channel', (e) => { return false })

  //Utility events
  ipcMain.on('logmessage', (e, msg) => { })
  ipcMain.on('logerror', (e, msg) => { })
}

export default function initWorker(args){
  app.on('ready', () => createGUI(args))
}

app.on('window-all-closed', () => {
  if(platform() !== 'darwin')app.quit()
  app.exit(0)
})