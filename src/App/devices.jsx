//Device list component
import { useEffect, useState } from 'react'

//override default console.log() with ../common/logger.mjs
//console.log = (msg) => api.send('logmessage', msg)
//console.error = (msg) => api.send('logerror', msg)




function Device({ device }){
  return <div className='device' key={'device_' + device.id} >
      <Toggle active={device.Active} label={device.Active ? 'On' : 'Off'} apiArgs={['connect', device]} />
      <div className='device_title'>{device.label}</div>
      <Toggle active={device.Face} label={'Face'} apiArgs={['setconfig', ['Devices', device.label, 'Face'], !device.Face]} />
      <Toggle active={device.Hand} label={'Hand'} apiArgs={['setconfig', ['Devices', device.label, 'Hand'], !device.Hand]} />
      <Toggle active={device.Body} label={'Body'} apiArgs={['setconfig', ['Devices', device.label, 'Body'], !device.Body]} />
    </div>
}


function Devices(props){
    const [devices, setDevices] = useState([])

    useEffect(() => {
      const subscribe = (channel) => {
        //subscribe to UI update event
        api.subscribe(channel, (e, data) => { 
          setDevices(data.map((d, i) => { return <Device device={d} key={'device_' + i} /> })) 
        })
      }
      const cleanup = () => { api.unsubscribe('devices', subscribe) }
      subscribe('devices') //subscribe to device updates
      
      return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={props.id} >{devices}</div>)
}

export default Devices