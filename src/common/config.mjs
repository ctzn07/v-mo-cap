//module that manages config.json file
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import EventEmitter from 'node:events'
import { isDev } from './util.mjs'
import { console } from './logger.mjs'

//options: get, set, delete, update
const printDebug = ['set'] //'set', 'get', 'delete', 'emit'

//TODO: fix non-dev root path
const root_path = path.join(app.getAppPath(), (isDev() ? '' : '../'))

const asset_path = path.join(root_path, './Assets/')

export const config = {}

//paths to config files
const config_path = path.join(root_path, './config.json')

//TODO: plugin loader
const loaded_plugin = null
const plugin_path = path.join(root_path, `./${loaded_plugin}.json`)

//how long the config manager waits for updates before writing to disk
const fileWriteInterval = 2000

//config module event emitter
class CFGEmitter extends EventEmitter {}
config.update = new CFGEmitter()

console.log('Config manager initialized')

const configTemplate = {
    //list of all config variables and default values
    Devices: {}, 
    Tracking: {
        Face: {
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        }, 
        Hand: {
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        }, 
        Body: {
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        },
    },
    User: { 
        WebsocketPort: 8080, 
        PreferredGPU: 'dGPU',   //options: 'dGPU', 'iGPU'
    }, 
}

const datastorage = {}

function newStorage(id, path = null, template){
    console.log(`New storage: ${id}`)
    datastorage[id] = {filepath: path}
    if(path){   //filepath was supplied, check file
        if(fs.existsSync(path)){    //file exists, load 
            console.log(`File for ${id} exists, loading...`)
            const data = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8', JSON: true }))
            Object.assign(datastorage[id], data)
        }
        else{   //no file exists, write new one
            console.log(`Creating new file for ${id}...`)
            Object.assign(datastorage[id], template)
            writeFile(id)
        }
    }
    else {  //no filepath, consider it a temporary storage
        Object.assign(datastorage[id], template || {})
    }
}

let write_timer = null
//writes current config object to file
function writeFile(store_id){
    if(datastorage[store_id].filepath){   //if filepath exists, write to file
        clearTimeout(write_timer)
        //time-gate to prevent constant re-writing
        write_timer = setTimeout(() => {
            const writedata = {}
            const path = datastorage[store_id].filepath

            Object.assign(writedata, datastorage[store_id]) //make a copy of the data
            delete writedata.filepath   //remove filepath

            console.log('Updating config.json')
            fs.writeFileSync(path, JSON.stringify(writedata, null, 4), { encoding: 'utf-8' })
        }, fileWriteInterval)
    }
}

//special function that makes sure new devices always have config entry
config.devicelist = (list) => {
    //check for config entries
    for(const label of list){
        if(!datastorage['config'].Devices[label]){
            //no entry for device exists, generate new one
            const template = {
                label: label, 
                id: crypto.randomUUID().split('-')[0], 
                Face: false, 
                Body: false, 
                Hand: false, 
                Calibration: {
                    Loc: {x: 0, y: 0, z: 0}, 
                    Rot: {x: 0, y: 0, z: 0}, 
                    Lens: {k1: 0, k2: 0, k3: 0, centerX: 0.5, centerY: 0.5}
                } 
            }
            config.set(`config/Devices/${label}`, template)
        }
    }
    //!!! this code should not be here, as it is an exception to design rules
    //TODO: find a workaround that doesn't require specifically setting device to inactive on disconnect
    /*
    for(const d of Object.keys(datastorage.config.Devices)){
        if(!list.includes(d) && datastorage.config.Devices[d].Active){      
            config.set(`config/Devices/${d}/Active`, false)
        }
    }
    */
    config.set(`session/Devices/Connected`, list)
}

/*
//update available devices to session storage
    const newList = new Set(list)
    const oldList = new Set(Object.keys(config.get('session/Devices') || {}))

    for(const device of oldList){
        if(!newList.has(device)){
            //new device list no longer has entry -> set inactive & unavailable
            //config.set(`session/Devices/${device}/Active`, false)
            //config.set(`session/Devices/${device}/Available`, false)
            config.delete(`session/Devices/${device}`)
        }
    }

    for(const device of newList){
        if(oldList.has(device)){
            //device has existing session entry
            if(!datastorage.session.Devices[device].Available){
                //but it's not marked as available -> update availability
                //config.set(`session/Devices/${device}/Available`, true)
            }
        }
        else{
            //device has existing session entry, create new entry from template
            const template = { 
                Active: false, 
            }
            //config.set(`session/Devices/${device}`, Object.assign({}, template))
            
        }
    }
*/

function cleanRoute(path){
    const route = path.split ? path.split('/') : [path]
    if(!route.at(-1))route.pop()    //remove trailing '/'
    return route
}

const getRef = (path) => {
    const route = cleanRoute(path)
    const target = route.pop()
    try {
        const ref = route.reduce((r, c) => r[c], datastorage)
        return ref[target]
    }
    catch(e){
        console.error(`config.get failed (${route.join('/')})`)
        return null
    }
}

const setRef = (path, value) => {
    const route = cleanRoute(path)
    const target = route.pop()
    const ref = route.reduce((r, c) => r[c] ? r[c] : r[c] = {}, datastorage)
    ref[target] = value
}

const delRef = (path) => {
    const route = cleanRoute(path)
    const target = route.pop()
    
    try {
        const ref = route.reduce((r, c) => r[c] ? r[c] : r[c] = {}, datastorage)
        delete ref[target]
    } catch (e) {
        console.error(`config.delete (${route.join('/')}) failed`)
    }
}

const emitPath = (path) => {
    const route = cleanRoute(path)
    while(route.length){
        if(printDebug.includes('emit')){ console.log('config.update.emit', route.join('/')) }
        config.update.emit(route.join('/'), getRef(route.join('/')))
        route.pop()
    }
}

config.get = (path) => {
    const current = getRef(path)

    if(typeof current !== 'undefined'){
        if(printDebug.includes('get'))console.log(`config.get ${path}: ${current}(${typeof current})`)
        return current
    }
    else{
        console.error(`Failed to get config value( ${path} : ${current})`)
        return null
    }
}

config.set = (path, value) => {
    setRef(path, value)

    const current = getRef(path)
    if(printDebug.includes('set')){ console.log(`config.set ${path}: ${current}(${typeof current})`) }

    writeFile(path.split('/').at(0))
    //Update datastorage with deep copy of itself
    Object.assign(datastorage, JSON.parse(JSON.stringify(datastorage)))
    emitPath(path)
}
//if(route.length === 4)datastorage[route[0]][route[1]][route[2]][route[3]] = value

config.delete = (path) => {
    if(printDebug.includes('delete'))console.log(`config.delete ${path}`)
    setRef(path, null)
    emitPath(path)
    setTimeout(() => {
        delRef(path)
    }, 1000);
}

newStorage('config', config_path, configTemplate)
newStorage('session', null, {})

/*
    let current = datastorage
    for (let i = 0; i < route.length - 1; i++) {
        const key = route[i]
        if (!(key in current))break
        current = current[key]
    }
    current[route.at(-1)] = value
*/