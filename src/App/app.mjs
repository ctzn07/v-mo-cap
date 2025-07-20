//electron script for App main GUI
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'
import { isDev, platform } from '../common/util.mjs'

function createWindow(){
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      //preload: path.join(app.getAppPath() + '/api.js'),
    },
    //autoHideMenuBar: true,
  })
  const htmlpath = path.join(app.getAppPath() + '/App.html')
  console.log(htmlpath)
  win.loadFile(htmlpath)

  if(isDev())win.webContents.openDevTools()

  return win
}


//initialization script
export default function initApp(args){
  console.log('App initialized')
  console.log('Arguments:', args)
  console.log('opening main window...')
  createWindow()
}









/*
newWindow(filepath){
    const createWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences:{
          
      }
    })
    //win.webContents.openDevTools()
    win.loadFile('./src/App/index.html')
  }

    app.whenReady().then(() => {
      createWindow()
    })

*/