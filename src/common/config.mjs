//module that manages config.json file
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { isDev } from './util.mjs'
import { console } from './logger.mjs'

//TODO: fix non-dev root path
const root_path = path.join(app.getAppPath(), (isDev() ? '' : '../'))

const asset_path = path.join(root_path, '/Assets/')

//path to config file
const config_path = path.join(root_path, '/config.json')

export const config = {}

console.log('Config manager initialized')

const configTemplate = {
    //list of all config variables and default values
    devices: {}, 
    mediapipe: { 
        PoseLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/pose_landmarker_lite.task',
                modelAssetPath: '', 
                delegate: 'GPU',  //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
            },
        HandLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/hand_landmarker.task',
                modelAssetPath: '', 
                delegate: 'GPU',    //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            },
        FaceLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/face_landmarker.task', 
                modelAssetPath: '', 
                delegate: 'GPU',    //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        }, 
        wasm: ''
    },
    user: { 
        tracker_port: 8080, 
        preferredGPU: 'dGPU',
    }, 
}

//memory copy of configs
var configuration = {}

let write_timer = null
//writes current config object to file
function writeConfigFile(){
    clearTimeout(write_timer)
    //500ms time-gate to prevent constant re-writing
    write_timer = setTimeout(() => {
        console.log('Updating config.json')
        fs.writeFileSync(config_path, JSON.stringify(configuration, null, 4), { encoding: 'utf-8' })
    }, 500)
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
config.update = (update, bAllowChanges = false) => {
    updateObject(configuration, update, bAllowChanges)
    writeConfigFile()
}

function generateDevice(label){
    return {                             
        label: label,
        deviceId: crypto.randomUUID().split('-')[0], 
        modules: { 
            FaceLandmarker: false, 
            PoseLandmarker: false, 
            HandLandmarker: false 
        }, 
        location: {x: 0, y: 0, z: 0}, 
        rotation: {x: 0, y: 0, z: 0}, 
        //constraints for .getUserMedia()
        mediaConstraints: {
            video: {
                //width: { ideal: 512 },
                //height: { ideal: 512 }, 
                aspectRatio: { ideal: 1.778 }, 
                frameRate: { ideal: 30 },
                facingMode: { ideal: 'environment' }
            }
        }
    }
}

//find device by label
config.device = (label) => {
    //if data exists for that label, return it
    if(configuration.devices[label])return configuration.devices[label]

    //no label found, create new from template
    const device = generateDevice(label)
    console.log('Generating entry for new device: ', label)
    config.update({ devices:{ [device.label]: device } }, true)
    return device
}

config.get = (path) => {
    //set current ref to json root
    let current = configuration
    //traverse to branch following the path array
    path.forEach(ref => { if(current[ref])current = current[ref] })
    return current
}

config.set = (path, value) => {
    if(path.length && value){
        //travel the path backwards, starting from furthest branch of json tree  
        let current = { [path.at(-1)]: value }
        //recursive branch wrap
        for(let i = path.length - 2; i >= 0; i--){ current = { [path[i]]: current } }
        config.update(current, true)
    }
    else{
        console.error('Empty path or value for config.set')
    }
    
}
//let current = { [path.at(-1)]: isNaN(value) ? value : Number(value) }

//check if config file status
if(fs.existsSync(config_path)){
    //config file exists, read
    console.log('config.json found, loading')
    configuration = JSON.parse(fs.readFileSync(config_path, { encoding: 'utf-8', JSON: true }))
}else{
    //config file doesn't exist, generate new from template
    console.log('config.json not found, generating new')
    //assign copy of config template to configuration object
    Object.assign(configuration, configTemplate)
    writeConfigFile()
}

//update filepaths in config to match current app location

config.set(['mediapipe', 'PoseLandmarker', 'baseOptions', 'modelAssetPath'], path.join(asset_path, 'pose_landmarker.task'))
config.set(['mediapipe', 'HandLandmarker', 'baseOptions', 'modelAssetPath'], path.join(asset_path, 'hand_landmarker.task'))
config.set(['mediapipe', 'FaceLandmarker', 'baseOptions', 'modelAssetPath'], path.join(asset_path, 'face_landmarker.task'))
config.set(['mediapipe', 'wasm'], path.join(asset_path, '/wasm/'))

//returns status of hardware acceleration
config.hwAcc = () => {
    return [
        config.get(['mediapipe', 'PoseLandmarker', 'baseOptions', 'delegate']), 
        config.get(['mediapipe', 'HandLandmarker', 'baseOptions', 'delegate']), 
        config.get(['mediapipe', 'FaceLandmarker', 'baseOptions', 'delegate'])
      ].includes('GPU')
}