//Module for formatting data to UI 
import { config } from '../common/config.mjs'

export const gui = {}

const rangeoptions = [
0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 
0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 
0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]


function cTemplate(type = '', text = '', path = '', options = []){
    return {
        type: type, 
        text: text, 
        path: path, //config path will be used to handle setconfig callbacks and showing value
        options: options
    }
}

//formats the device config data for UI
const deviceTemplate = (d) => {
    //input is just device label
    return {
        type: 'frame', 
        horizontal: true, 
        children: [
        //cTemplate('toggle', null, ['local', 'Devices', d, 'Active'], ['Off', 'On']), 
        cTemplate('toggle', null, `session/Devices/${d}/Active`, ['Off', 'On']), 
        cTemplate('text', null, `config/Devices/${d}/label`, null), 
        cTemplate('toggle', 'Face', `config/Devices/${d}/Face`, null), 
        cTemplate('toggle', 'Hand', `config/Devices/${d}/Hand`, null), 
        cTemplate('toggle', 'Body', `config/Devices/${d}/Body`, null), 
        ] 
    }
}

//formats config options for the UI
const configTemplate = () => {
return [
    {
        type: 'frame', 
        horizontal: false, 
        children: [
            cTemplate('text', 'User Settings', null, null), 
            cTemplate('select', 'Websocket Port', 'config/User/WebsocketPort', [8080]), 
            cTemplate('select', 'Preferred GPU', 'config/User/PreferredGPU', ['dGPU', 'iGPU']), 
        ],
    }, 
    {
        type: 'frame', 
        horizontal: false, 
        children: [
            cTemplate('text', 'Face Tracking', null, null), 
            cTemplate('select', 'TrackingConfidence', 'config/Tracking/Face/TrackingConfidence', rangeoptions), 
            cTemplate('select', 'Detection Hardware', 'config/Tracking/Face/Hardware', ['GPU', 'CPU']), 
        ],
    },
    {
        type: 'frame', 
        horizontal: false, 
        children: [
            cTemplate('text', 'Hand Tracking', null, null), 
            cTemplate('select', 'TrackingConfidence', 'config/Tracking/Hand/TrackingConfidence', rangeoptions), 
            cTemplate('select', 'Detection Hardware', 'config/Tracking/Hand/Hardware', ['GPU', 'CPU']), 
        ],
    },
    {
        type: 'frame', 
        horizontal: false, 
        children: [
            cTemplate('text', 'Body Tracking', null, null), 
            cTemplate('select', 'TrackingConfidence', 'config/Tracking/Body/TrackingConfidence', rangeoptions), 
            cTemplate('select', 'Detection Hardware', 'config/Tracking/Body/Hardware', ['GPU', 'CPU']), 
        ],
    },
]
}

function injectValues(frame){
frame.children.forEach(child => {
    if(child.path){
        const value = config.get(child.path)
        child.value = value
    }
    })
    return frame
}

gui.devices = () => {
    const devices = config.get('session/Devices') || {}
    //console.log('GUI GOT THESE: ', devices)
    const frames = []
    for(const d of Object.keys(devices)){
        if(devices[d].Available)frames.push(deviceTemplate(d))
    }
    return frames.map(f => injectValues(f))
}

gui.config = () => {
    const frames = configTemplate()
    return frames.map(f => injectValues(f))
}

gui.preview = () => {
    //preview is suppose to return current tracking coordinates
    //not implemented yet
    
    return []
}