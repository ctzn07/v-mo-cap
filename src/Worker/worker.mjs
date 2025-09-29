//electron script for worker backend(GUI merely acts as a worker)
import { app, BrowserWindow, ipcMain } from 'electron'
import EventEmitter from 'node:events'
import fs from 'node:fs'
import { WebSocket } from 'ws'
import { isDev, platform } from '../common/util.mjs'
import path from 'path'

//TODO
//check config data
//connect websocket
//do websocket bindings to corresponding events
//close window/exit application when websocket connection closes

function createGUI(params){
  const win = new BrowserWindow({
    width: 800, 
    height: 800, 
    webPreferences: {
      //todo: check is path right for production
      preload: path.join(app.getAppPath() + '/src/common/api.mjs'),
      sandbox: false,   //preloading .mjs is not compatible with sandboxing
    }, 
    autoHideMenuBar: true, 
    show: isDev(), 
    title: `VMC Worker(${params.route.split('/').at(-1)})`, 
  })
  //todo: check is path right for production
  const htmlpath = path.join(app.getAppPath() + '/dist/worker.html')
  win.loadFile(htmlpath)
  if(isDev()){ win.webContents.openDevTools() }

  //page has finished loading
  win.webContents.on('did-finish-load', () => {
    //connect to main app using websocket
    const ws = new WebSocket(`ws://localhost:${params.route}`, {perMessageDeflate: false})

    //Events from main process
    ws.on('open', () => ws.send(JSON.stringify('test')))
    
    ws.on('message', (packet, isBinary) => {})

    //on error/connection loss, close the window -> app quit
    ws.on('error', (e) => {
      console.log(e)
      win.close()
    })
    ws.on('close', () => win.close())

    //Events for receiving data from UI
    ipcMain.on('main', (e, ...args) => {})

    //Utility events
    //ipcMain.on('logmessage', (e, msg) => { })
    //ipcMain.on('logerror', (e, msg) => { })
    
  })
}

export default function initWorker(args){
  app.on('ready', () => createGUI(args))
}

app.on('window-all-closed', () => {
  if(platform() !== 'darwin')app.quit()
  app.exit(0)
})

/*
const mp_tempconfig = {
        PoseLandmarker: {
            baseOptions: {
                modelAssetPath: 'D:\\VSCode_Projects\\pxltask\\Assets\\task\\pose_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'IMAGE',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false
        },
        HandLandmarker: {
            baseOptions: {
                modelAssetPath: 'D:\\VSCode_Projects\\pxltask\\Assets\\task\\hand_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'IMAGE',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        },
        FaceLandmarker: {
            baseOptions: {
                modelAssetPath: 'D:\\VSCode_Projects\\pxltask\\Assets\\task\\face_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'IMAGE',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false
        },
        wasm: 'D:\\VSCode_Projects\\pxltask\\Assets\\wasm\\'
    }
*/



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