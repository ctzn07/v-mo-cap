//Device list component
import { useEffect, useState } from 'react'
import { ToggleButton, DeviceStatusText } from './gui_library'

//override default console.log() with ../common/logger.mjs
//console.log = (msg) => api.send('logmessage', msg)
//console.error = (msg) => api.send('logerror', msg)

//enumerate media devices with videoinput type
function devicelist(callback){  
  navigator.mediaDevices.enumerateDevices()
    .then(devicelist => devicelist.filter(device => device.kind === 'videoinput'))
    .then(list => callback(list.map(d => d.toJSON())))
    .catch(e => console.error(e))
}

function Device(device){
  return <div 
    className='component' 
    key={'device_' + device.id} >
      <div className='component_label' onClick={() => {}} >{device.label}</div>
      <ToggleButton labels={['On', 'Off']} active={device.active} callback={() => api.send('connect', device)} />
      <div style={{paddingLeft: 'inherit', paddingRight: 'inherit', display: 'block', width: '100%', overflow: 'hidden'}}>
        {device.active ? <DeviceStatusText device={device}/> : null}
      </div>
      <div style={{display: 'flex'}}>
        <ToggleButton labels={['Face']} active={device.modules.FaceLandmarker} callback={(bool) => api.send('setconfig', ['devices', device.label, 'modules', 'FaceLandmarker'], bool)} />
        <ToggleButton labels={['Hand']} active={device.modules.HandLandmarker} callback={(bool) => api.send('setconfig', ['devices', device.label, 'modules', 'HandLandmarker'], bool)} />
        <ToggleButton labels={['Body']} active={device.modules.PoseLandmarker} callback={(bool) => api.send('setconfig', ['devices', device.label, 'modules', 'PoseLandmarker'], bool)} />
      </div>
    </div>
}
//changing display: 'block' (line 26) changes toggle buttons to vertical

let timegate = null //do not declare inside component

function Devices(props){
    const [devices, setDevices] = useState([])

    useEffect(() => {
      const subscribe = (channel) => {
        //subscribe to UI update event
        api.subscribe(channel, (e, data) => { 
          setDevices(data.map(d => { return Device(d) })) 
        })
      }

      const cleanup = () => {
        clearTimeout(timegate)
        navigator.mediaDevices.ondevicechange = null
        api.unsubscribe('device', subscribe)
      }

      //Device change event
      navigator.mediaDevices.ondevicechange = () => {
        //ondevicechange() triggers multiple times for some devices
        //use timeout to only trigger on last event
        clearTimeout(timegate)
        timegate = setTimeout(() => devicelist((list) => api.send('devicelist', list)), 100)
      }
      subscribe('device') //subscribe to device updates
      navigator.mediaDevices.ondevicechange() //call initial update

      return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={props.id} >{devices}</div>)
}

export default Devices