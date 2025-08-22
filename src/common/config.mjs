//module that manages config.json file
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import EventEmitter from 'node:events'
import { isDev } from './util.mjs'
import { console } from './logger.mjs'

//TODO: fix non-dev root path
const root_path = path.join(app.getAppPath(), (isDev() ? '' : '../'))

const asset_path = path.join(root_path, '/Assets/')

//path to config file
const config_path = path.join(root_path, '/config.json')

//how long the config manager waits for updates before writing to disk
const fileWriteInterval = 2000

export const config = {}

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

//memory copy of configs
config.data = {}

let write_timer = null
//writes current config object to file
function writeConfigFile(){
    clearTimeout(write_timer)
    //500ms time-gate to prevent constant re-writing
    write_timer = setTimeout(() => {
        console.log('Updating config.json')
        fs.writeFileSync(config_path, JSON.stringify(config.data, null, 4), { encoding: 'utf-8' })
    }, fileWriteInterval)
}

//updates existing object with partial object that matches to the target structure.
const updateObject = (target, source, allowChanges) => {
    const keys = Object.keys(source)
    if(keys.length){
        keys.forEach((key) => {
            //console.print(key, typeof source[key])
            if(typeof source[key] !== 'string' && key in target){
                //there is probably a bug here, values are not getting updated without bAllowChanges
                //even tho the boolean was intended to only allow json structural changes
                if(updateObject(target[key], source[key], allowChanges)){
                    target[key] = source[key]
                }
            }else{
                //field does not exists, check if function is allowed to make changes
                if(allowChanges)target[key] = source[key]
                //else console.log('discarding excess data', key + ':' + source[key])
            }
        })
        //no object tree values found, return false
        return false
    }else{
        //end of object tree branch
        return true
    }
}

//function to update configuration object with boolean to allow making changes to the structure
function configUpdate(update, bAllowChanges = false){
    updateObject(config.data, update, bAllowChanges)
    writeConfigFile()
}

function generateDevice(label){
    return {
        label: label,
        id: crypto.randomUUID().split('-')[0], 
        Active: false, 
        Face: false, 
        Body: false, 
        Hand: false,  
        Location: {x: 0, y: 0, z: 0}, 
        Rotation: {x: 0, y: 0, z: 0}, 
        Lens: {k1: 0, k2: 0, k3: 0, centerX: 0.5, centerY: 0.5}
    }
}

//find device by label
config.device = (label) => {
    if(label != undefined){
        //if data exists for that label, return it
        if(config.data.Devices[label]){
            return config.data.Devices[label]
        }
        else {
            //no label found, create new from template
            const device = generateDevice(label)
            console.log('Generating entry for new device: ', label)
            configUpdate({ Devices:{ [device.label]: device } }, true)
            return device
        }        
    }
    else {
        console.error('Config.device label is undefined')
    }
}

config.get = (path) => {
    //set current ref to json root
    let current = config.data
    //traverse to branch following the path array
    path.forEach(ref => { if(current[ref])current = current[ref] })
    return current
}

config.set = (path, value) => {
    if(value === undefined){ console.error('config.set value is undefined') }
    else if(path.includes(undefined)){ console.error('config.set path contains undefined') }
    else if(!path.length){ console.error('no path provided for config.set') }
    else{
        //travel the path backwards, starting from furthest branch of json tree  
        let current = { [path.at(-1)]: value }
        //recursive branch wrap
        for(let i = path.length - 2; i >= 0; i--){ current = { [path[i]]: current } }
        configUpdate(current, false)

        //signal changes to configuration
        for(const p of path){ config.update.emit(p) }
    } 
}
//let current = { [path.at(-1)]: isNaN(value) ? value : Number(value) }

//check if config file status
if(fs.existsSync(config_path)){
    //config file exists, read
    console.log('config.json found, loading')
    config.data = JSON.parse(fs.readFileSync(config_path, { encoding: 'utf-8', JSON: true }))
}else{
    //config file doesn't exist, generate new from template
    console.log('config.json not found, generating new')
    //assign copy of config template to configuration object
    Object.assign(config.data, configTemplate)
    writeConfigFile()
}

//update filepaths in config to match current app location
config.set(['Tracking', 'Face', 'Filepath'], path.join(asset_path, 'face_landmarker.task'))
config.set(['Tracking', 'Hand', 'Filepath'], path.join(asset_path, 'hand_landmarker.task'))
config.set(['Tracking', 'Body', 'Filepath'], path.join(asset_path, 'pose_landmarker.task'))
config.set(['Tracking', 'WebAssembly', 'Filepath'], path.join(asset_path, '/wasm/'))

//reset all devices active state to false
Object.keys(config.data.Devices).forEach(label => config.set(['Devices', label, 'Active'], false))

//returns status of hardware acceleration
config.hwAcc = () => {
    return [
        config.get(['Tracking', 'Face', 'Hardware']), 
        config.get(['Tracking', 'Hand', 'Hardware']), 
        config.get(['Tracking', 'Body', 'Hardware']), 
      ].includes('GPU')
}