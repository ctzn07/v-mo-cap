//module that manages config.json file
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import EventEmitter from 'node:events'
import { isDev } from './util.mjs'
import { console } from './logger.mjs'

//options: get, set, delete, update
const printDebug = ['update']

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
            Filepath: '', 
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        }, 
        Hand: {
            Filepath: '', 
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        }, 
        Body: {
            Filepath: '', 
            Hardware: 'GPU',    //options: 'CPU', 'GPU'
            TrackingConfidence: 0.5, 
        }, 
        WebAssembly: {
            Filepath: ''
        }
    },
    User: { 
        WebsocketPort: 8080, 
        PreferredGPU: 'dGPU',   //options: 'dGPU', 'iGPU'
    }, 
}

const datastorage = {}

function newStorage(id, filepath = null, template){
    console.log(`Initiating new ${id} storage`)
    datastorage[id] = {filepath: filepath}
    if(filepath && fs.existsSync(filepath)){
        console.log(`File for ${id} already exists, loading...`)
        const data = JSON.parse(fs.readFileSync(filepath, { encoding: 'utf-8', JSON: true }))
        Object.assign(datastorage[id], data)
    }
    else {
        if(template){
            console.log(`Creating new file for storage ${id}...`)
            Object.assign(datastorage[id], template)
            writeFile(id)
        }
        else{
            console.error(`New storage ${id} initiated, but no template supplied`)
        }
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

function getOperand(a){
    switch (typeof a) {
        case 'object':
            return new Object()
        case 'boolean':
            return new Boolean()
        case 'number':
            return new Number()
        case 'bigint':
            return new BigInt()
        case 'string':
            return new String()
        case 'symbol':
            return new Symbol()
        default:
            return null
    }
}

//updates existing object with partial object that matches to the target structure.
const updateObject = (target, source, allowChanges, path = []) => {
    const updates = []
    if(typeof source !== 'undefined'){
        //iterate over all json fields
        Object.keys(source).forEach(field => {  
            path.push(field)
            updates.push({route: path.join('/'), data: source[field]})

            if(target[field] && typeof target[field] === 'object'){ //destination is object, dig deeper
                updateObject(target[field], source[field], allowChanges, path)
            }
            else if(typeof target[field] === typeof source[field]){ //destination matches, update value
                target[field] = source[field]
            }
            else if(typeof target[field] === 'undefined'){  //destination is not defined
                if(allowChanges){
                    //target[field] = source[field]
                    target[field] = getOperand(source[field])
                    updateObject(target[field], source[field], allowChanges, path)
                } else { console.error('some error message about blocking config changes') }
            }
        })
    }else{
        console.error(`Unable to update config object '${path.join('/')}' with value '${source}'`)
    }
    for(const update of updates){
        if(printDebug.includes('update'))console.log('update: ' + update.route + ': ' + update.data)
        config.update.emit(update.route, update.data)
    }    
}


//function to update configuration object with boolean to allow making changes to the structure
function configUpdate(id, update, bAllowChanges = false){
    //console.log('configUpdate', id, 'allow changes:', bAllowChanges, ' data:', update)
    if(datastorage[id] && typeof update === 'object'){
        updateObject(datastorage[id], update, bAllowChanges)
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
    //remove target storage from path
    const store_id = path[0]
    //console.log('config.get', path.join(' > '))
    if(datastorage[store_id]){
        //set current ref to object root
        let current = datastorage[store_id]
        //traverse to branch following the path array(skipping 0 as it is storage indicator)
        path.forEach((ref, i) => { if(i)current = current[ref] } )
        if(printDebug.includes('get'))console.log('config.get', path.join(' > ') + ': ' + current)

        const returnvalue = current
        return returnvalue
    }
    else{
        console.error(`config.get - unknown storage path: ${store_id}`)
        return {}
    }
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
    else {
        return true
    }
}

config.set = (path, value) => {
    //remove target storage from path
    const store_id = path[0]
    if(printDebug.includes('set'))console.log('config.set', path.join(' > '),' : ' , (typeof value === 'object') ? JSON.stringify(value) : value)
    
    

    if(setCheck(path, value) && datastorage[store_id]){
        //travel the path backwards, starting from furthest branch of json tree  
        let current = { [path.at(-1)]: value }
        //recursive branch wrap
        for(let i = path.length - 2; i >= 1; i--){ current = { [path[i]]: current } }

        //only allow structural changes to storages that don't get written to file
        configUpdate(store_id, current, (!datastorage[store_id].filepath))
    } 
}

config.delete = (path) => {
    const store_id = path[0]
    // Only allow structural changes to storages that don't get written to file
    if (!datastorage[store_id].filepath && store_id) {
        let current = datastorage[store_id]
        let prop = path.at(-1)
        // Traverse to the parent of the property to delete
        //while (path.length > 1){ parent = parent[path.shift()] }
        path.forEach((ref, i) => { if(i && ref !== prop)current = current[ref] } )
        if(current[prop]){
            if(printDebug.includes('delete'))console.log('config.delete', path.join(' > '))
            delete current[prop]
        }
        else {
            console.error('config.delete - no entry found')
        }
    }
}


newStorage('config', config_path, configTemplate)
newStorage('local', null, {})

//update filepaths in config to match current app location
config.set(['config', 'Tracking', 'Face', 'Filepath'], path.join(asset_path, 'face_landmarker.task'))
config.set(['config', 'Tracking', 'Hand', 'Filepath'], path.join(asset_path, 'hand_landmarker.task'))
config.set(['config', 'Tracking', 'Body', 'Filepath'], path.join(asset_path, 'pose_landmarker.task'))
config.set(['config', 'Tracking', 'WebAssembly', 'Filepath'], path.join(asset_path, '/wasm/'))

//returns status of hardware acceleration
config.hwAcc = () => {
    return [
        config.get(['config', 'Tracking', 'Face', 'Hardware']), 
        config.get(['config', 'Tracking', 'Hand', 'Hardware']), 
        config.get(['config', 'Tracking', 'Body', 'Hardware']), 
      ].includes('GPU')
}