//Device list component
import { useEffect, useState } from 'react'

//override default console.log() with ../common/logger.mjs(see definition in preload script)
console.log = (msg) => api.send('logmessage', msg)
console.error = (msg) => api.send('logerror', msg)

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
  

  return <div className='device' key={'device_' + device.id} >{device.label}</div>
}

/* Device template(see deviceDataTemplate @ app.mjs line 18)
{
  label: string, 
  id: string, 
  active: boolean, 
  modules: {
    FaceLandmarker: boolean, 
    Handlandmarker: boolean, 
    Poselandmarker: boolean
  }, 
  performance: {
    fps: number,
    errors: number,
  }
}
*/

let timegate = null //do not declare inside component

function Devices(props){
    const [devices, setDevices] = useState([])

    useEffect(() => {
      const subscribe = (channel) => {
        //subscribe to UI update event
        api.subscribe(channel, (e, data) => {
          //TODO: Sort devices by activity and name?
          console.log(data)
          setDevices(data.map(d => { return Device(d) }))
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
        timegate = setTimeout(() => devicelist((list) => api.send('devicelist', list)), 100)
      }
      
      //subscribe to UI updates
      subscribe('device')
      //call initial update
      navigator.mediaDevices.ondevicechange()

      return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={props.id} >{devices}</div>)
}

export default Devices