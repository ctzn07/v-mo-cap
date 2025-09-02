import { app, BrowserWindow } from 'electron'
import { console } from '../common/logger.mjs'
import path from 'path'

function createGUI(){
  const win = new BrowserWindow({
    width: 400,
    height: 400,  
    webPreferences: {
      //todo: check is path right for production
      preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
      sandbox: false,   //preloading .mjs is not compatible with sandboxing
    },
    autoHideMenuBar: true,
    title: 'TRACKER'
  })
  //todo: check is path right for production
  const htmlpath = path.join(app.getAppPath() + '/dist/tracker.html')
  win.loadFile(htmlpath)
  console.log('New BrowserWindow: ', htmlpath)

  if(isDev())win.webContents.openDevTools()
}

export default function initTracker(args){
  console.log('Tracker Class initialized')
  console.log('Arguments:', args)
  createGUI()
}