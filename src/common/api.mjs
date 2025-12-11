import { contextBridge, ipcRenderer } from 'electron'
//NOTE: imports in preload script create new instances of modules

contextBridge.exposeInMainWorld('api', {
    //UI to Main
    send: (channel, ...args) => ipcRenderer.send(channel, ...args), 

    //UI Subscriptions 
    subscribe: (channel, callback) => ipcRenderer.on(channel, (...args) => callback(...args)), 
    unsubscribe: (channel, listener) => ipcRenderer.removeListener(channel, listener), 

    //UI->Main Data requests
    request: (channel, ...args) => ipcRenderer.invoke(channel, ...args), 
    }
)
