//module that manages config.json file
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import EventEmitter from 'node:events'
import { isDev } from './util.mjs'
import { console } from './logger.mjs'

//options: get, set, delete, update
const printDebug = ['get', 'set']

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

//updates existing object with partial object that matches to the target structure.
const updateObject = (target, source, allowChanges, path = []) => {
    if(typeof source !== 'undefined'){
        //iterate over all json fields
        Object.keys(source).forEach(field => {
            path.push(field)
            //to prevent emitter data race condition, save path before making changes
            const emitPath = path.join('/')

            if(printDebug.includes('update'))console.log('update', path.join('/') + ': ' + source[field])

            //destination is object, dig deeper
            if(target[field] && typeof target[field] === 'object'){ updateObject(target[field], source[field], allowChanges, path) }
            //destination matches, update value
            else if(typeof target[field] === typeof source[field]){ target[field] = source[field] }
            //destination is not undefined
            else if(typeof target[field] === 'undefined'){ 
                if(allowChanges){ 
                    //not-object means it's a value
                    if(typeof source[field] !== 'object'){ target[field] = source[field] }
                    //nothing found at the path, extend path with empty object and continue
                    else{ 
                        target[field] = {}
                        updateObject(target[field], source[field], allowChanges, path) 
                    }    
                } else { console.error(`Config structural changes are not allowed in '${path.join('/')}'`) }
            }
        //emit object updates
        config.update.emit(emitPath, source[field])
        })
    }else{
        console.error(`Unable to update config object '${path.join('/')}' with value '${source}'`)
    }
    
}


//function to update configuration object with boolean to allow making changes to the structure
function configUpdate(id, update, bAllowChanges = false){
    if(typeof update === 'object'){
        updateObject(datastorage, update, bAllowChanges)
        writeFile(id)
    }
    else {
        console.error(`Config Update on ${id} failed - data: ${typeof update} `)
    }
}

function generateDevice(label){
    return {
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
}

//generate device entry to config
config.devicelist = (list) => {
    for(const label of list){
        if(!datastorage['config'].Devices[label]){  //no entry for device exists, generate new one
            configUpdate('config', { Devices: { [label]: generateDevice(label) } }, true)
        }
    }
}

config.get = (path) => {
    //const route = path.includes('/') ? path.split('/') : [path]
    const route = path.split ? path.split('/') : [path]
    let current = datastorage
    
    route.forEach((ref) => { current = current[ref] } )
    if(printDebug.includes('get'))console.log('config.get', path + ': ' + current + `(${typeof current})`)

    const returnvalue = (typeof current === 'undefined') ? {} : current
    return returnvalue
    
}

function setCheck(path, value){
    if(value === undefined){
        console.error('config.set - missing argument: value')
        return false
    }
    if(path.includes(undefined)){
        console.error('config.set - path contains undefined')
        return false
    }
    if(!path.length){
        console.error('config.set - no path provided')
        return false
    }
    if(false){
        //TODO: check if value set could be skipped when existing value is the same as new
        //this would greatly reduce config event emits
        console.error('config.set - value is the same')
        return false
    }  
    else {
        return true
    }
}

config.set = (path, value) => {
    const route = path.split ? path.split('/') : [path]
    const store_id = route[0]
    if(printDebug.includes('set'))console.log('config.set', path,' : ' , (typeof value === 'object') ? JSON.stringify(value) : value)

    if(setCheck(route, value) && datastorage[store_id]){
        //build update object in reverse, starting from value
        let current = value
        while(route.length){ current = {[route.pop()]: current} }

        //only allow structural changes to storages that don't get written to file
        configUpdate(store_id, current, (!datastorage[store_id].filepath))
    } 
}

config.delete = (path) => {
    const route = path.split('/')
    const store_id = route[0]
    // Only allow structural changes to storages that don't get written to file
    if (!datastorage[store_id].filepath && store_id) {
        let current = datastorage[store_id]
        let prop = route.at(-1)
        // Traverse to the parent of the property to delete
        //while (path.length > 1){ parent = parent[path.shift()] }
        route.forEach((ref, i) => { if(i && ref !== prop)current = current[ref] } )
        if(current[prop]){
            if(printDebug.includes('delete'))console.log('config.delete', path)
            delete current[prop]
        }
        else {
            console.error('config.delete - no entry found')
        }
    }
}

newStorage('config', config_path, configTemplate)
newStorage('session', null, {})