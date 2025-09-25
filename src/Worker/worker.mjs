//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import { WebSocket } from 'ws'
import { isDev, platform } from '../common/util.mjs'
import path from 'path'

class IPCEmitter extends EventEmitter {}
const ipcRender = new IPCEmitter()

//helper for sending data to worker front-end
function sendData(channel, ...args){ ipcRender.emit(channel, ...args) }

/*
//TODO: this should be done at api.mjs
const requestData = (channel, ...args) => {
  let timer = null
  //unique response channel to tell requests apart
  const response_channel = crypto.randomUUID()

  return new Promise((resolve, reject) => {
    const listener = (...args) => {
      clearTimeout(timer)
      resolve(...args)
    }
    //one-time listener for response
    //NOTE: Replace this with global even emitter instead
    //setting up single-time listeners will probably clog up garbage collection
    ipcMain.once(response_channel, listener)

    timer = setTimeout(() => {
      ipcMain.removeListener(response_channel, listener)
      reject(new Error(`Data request on ${channel} timed out`))
    }, 1000)

    sendData(channel, response_channel, ...args)
  })
}*/

function createGUI(params){
  //data.ws     //websocket address
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
    title: `VMC Worker(${params.device})`, 
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
  //ipcRender.on('datarequest', (...args) => win.webContents.send('datarequest', ...args))
  ipcRender.on('startStream', (data) => win.webContents.send('startStream', data))

  win.webContents.on('did-finish-load', () => sendData('startStream', params.device))

  //Events for receiving data from worker front-end
  //ipcMain.on('channel', (e, data) => {})

  //Event for handling data requests from worker front-end
  //ipcMain.handle('params', (e, ...args) => { return params })

  //Utility events
  //ipcMain.on('logmessage', (e, msg) => { })
  //ipcMain.on('logerror', (e, msg) => { })
  
  
}

export default function initWorker(args){
  app.on('ready', () => createGUI(args))
}

app.on('window-all-closed', () => {
  if(platform() !== 'darwin')app.quit()
  app.exit(0)
})