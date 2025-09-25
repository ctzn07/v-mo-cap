import { contextBridge, ipcRenderer } from 'electron'
//NOTE: imports in preload script create new instances of modules

contextBridge.exposeInMainWorld('api', {
    //UI to Main
    send: (channel, ...args) => ipcRenderer.send(channel, ...args), 

    //UI Subscriptions 
    subscribe: (channel, callback) => ipcRenderer.on(channel, (...args) => callback(...args)), 
    unsubsribe: (channel, listener) => ipcRenderer.removeListener(channel, listener), 

    //UI->Main Data requests
    request: (channel, ...args) => ipcRenderer.invoke(channel, ...args), 

    //UI Utility
    //log: (message) => ipcRenderer.send('logmessage', message), 
    //error: (message) => ipcRenderer.send('logerror', message), 
    }
)
