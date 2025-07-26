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
      //todo: check is preload path right for production
      preload: path.join(app.getAppPath() + '/src/App/api.mjs'),
      sandbox: false,   //preloading .mjs is not compatible with sandboxing
    },
    autoHideMenuBar: true,
  })
  const htmlpath = path.join(app.getAppPath() + '/dist/app.html')
  win.loadFile(htmlpath)

  if(isDev())win.webContents.openDevTools()

  return win
}


ipcMain.on('logmessage', (e, msg) => console.log(msg))

//initialization script
export default function initApp(args){
  console.log('App initialized')
  console.log('Arguments:', args)
  console.log('opening main window...')
  createWindow()
}
