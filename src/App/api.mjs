import { contextBridge, ipcRenderer } from 'electron'
//NOTE: imports in preload script create new instances of modules

contextBridge.exposeInMainWorld('api', {
    //UI to Main
    send: (channel, ...args) => ipcRenderer.send(channel, ...args), 
    //devicelist: (list) => ipcRenderer.send('devicelist', list), 
    //setconfig: (...args) => ipcRenderer.send('updateconfig', ...args), 
    //connect: (device) => ipcRenderer.send('connect', device), 

    //UI Subscriptions
    //update: (callback) => ipcRenderer.on('update', (...args) => callback(...args)), 
    subscribe: (channel, callback) => ipcRenderer.on(channel, (...args) => callback(...args)), 
    unsubsribe: (channel, listener) => ipcRenderer.removeListener(channel, listener), 

    //UI Data requests
    request: (channel, ...args) => ipcRenderer.invoke(channel, ...args), 
    //getconfig: (...args) => ipcRenderer.invoke('getconfig', ...args), 
    //deviceStatus: (...args) => ipcRenderer.invoke('devicestatus', ...args), 

    //UI Utility
    //log: (message) => ipcRenderer.send('logmessage', message), 
    //error: (message) => ipcRenderer.send('logerror', message), 
    }
)