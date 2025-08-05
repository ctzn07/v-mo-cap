//Device list component
import { useEffect, useState } from 'react'

//override default console.log() with ../common/logger.mjs(see definition in preload script)
//console.log = api.log
console.error = api.error

//enumerate media devices with videoinput type
function devicelist(callback){  
  navigator.mediaDevices.enumerateDevices()
    .then(devicelist => devicelist.filter(device => device.kind === 'videoinput'))
    .then(list => callback(list.map(d => d.toJSON())))
    .catch(e => console.error(e))
}

const getConfig = (path, callback) => {
  api.getconfig(path)
    .then(data => callback(data))
    .catch(err => console.log(err))
}

let timegate = null //do not move, react wont like that

function ModulePicker(props){
  //props.device
  const [modules, setModules] = useState({})

  const deviceUpdate = (label, module, value) => {
    api.setconfig({ devices: { [label]: { modules: { [module]: value } } } })
    getConfig(['devices', props.device.label, 'modules'], setModules)
  }

  //get initial config values
  useEffect(() => getConfig(['devices', props.device.label, 'modules'], setModules), [])
  
  
    return (
    <button  key={'mod' + i} 
      onClick={() => deviceUpdate(props.device.label, mod, !modules[mod])} >
      {module_map.get(mod)}
      <input type='checkbox' checked={modules[mod]} readOnly={true} />
    </button>
    )
  
  return buttons
}

function Device(device){
  return <h1>{device.label}</h1>
}


function Devices(props){
    const [devices, setDevices] = useState([])

    useEffect(() => {
      const subscribe = () => {
        //subscribe to UI update event
        api.update((e, data) => {
          //if update contains data about devices, set it to state
          if(data.devices)setDevices(data.devices.map(d => { return Device(d) }))
        })
      }

      const cleanup = () => {
        clearTimeout(timegate)
        navigator.mediaDevices.ondevicechange = null
        api.unsubscribe('update', subscribe)
      }

      //Device change event
      navigator.mediaDevices.ondevicechange = () => {
        //ondevicechange() triggers multiple times for some devices
        //use timeout to only trigger on last event
        clearTimeout(timegate)
        timegate = setTimeout(() => devicelist((list) => api.devicelist(list)), 100)
      }
      
      //subscribe to UI updates
      subscribe()
      //call initial update
      navigator.mediaDevices.ondevicechange()

      return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={props.id} >{devices}</div>)
}

export default Devices

/** media device template
  {
    deviceId: '8e9d20f530d175ea8e1d03cca6ac55859c530c490973ffa1fd3f00efd808e76e',
    kind: 'videoinput',
    label: 'Logi C270 HD WebCam (046d:0825)',
    groupId: 'adac2e907ff4797737755be47672aeca9178072fc272f5add682437b32339be1',
    aspectRatio: { max: 1280, min: 0.0010416666666666667 },
    facingMode: [],
    frameRate: { max: 30, min: 1 },
    height: { max: 960, min: 1 },
    resizeMode: [ 'none', 'crop-and-scale' ],
    width: { max: 1280, min: 1 },
    status: 'available'
  }
*/