import { contextBridge, ipcRenderer } from 'electron'
//NOTE: imports in preload script create new instances of modules

contextBridge.exposeInMainWorld('api', {
    //UI to Main
    devicelist: (list) => ipcRenderer.send('devicelist', list), 
    setconfig: (update) => ipcRenderer.send('updateconfig', update), 

    //UI Subscriptions
    stats: (callback) => ipcRenderer.on('previewdata', (...args) => callback(...args)), 
    update: (callback) => ipcRenderer.on('update', (...args) => callback(...args)), 
    unsubsribe: (channel, listener) => ipcRenderer.removeListener(channel, listener), 

    //UI Data requests
    getconfig: (...args) => ipcRenderer.invoke('getconfig', ...args), 

    //UI Utility
    log: (message) => ipcRenderer.send('logmessage', message), 
    error: (message) => ipcRenderer.send('logerror', message), 
    }
)