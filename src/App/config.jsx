//Config menu component
import { useEffect, useState } from 'react'
import { ConfigField, ConfigEntry } from './gui_library'


function Config(props){
    const [configs, setConfigs] = useState([])

    useEffect(() => {
        const subscribe = (channel) => {
            //subscribe to UI update event
            api.subscribe(channel, (e, data) => { 
            //setConfigs(data.map(c => { return ConfigEntry(c) }))
            console.log(data)
            })
        }

        const cleanup = () => { api.unsubscribe('config', subscribe) }

        subscribe('config') //subscribe to config updates
        //api.send('setconfig', [], null) //call initial update

        return cleanup
    }, [])

    //return (<div className={'page anim_fade'} id={props.id} >{configs}</div>)
    return <div className={'page anim_fade'} id={props.id} >{'config page placeholder'}</div>
}

export default Config

/*
{
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
*/

/*
<div className={'page anim_fade'} id={props.id}>
        <ConfigField label={'Tracking'}>
            <ConfigEntry name={'Tracking output format'} 
                type={'select'}  
                callback={value => api.send('setconfig', [], value)}
            />
        </ConfigField>
        <ConfigField label={'User'}>
            <ConfigEntry name={'Detection hardware'} type={'select'}/>
            <ConfigEntry name={'Websocket Port'}/>
        </ConfigField>
        <ConfigField label={'Mediapipe'}>
            <ConfigEntry 
                name={'Detection score treshold'} 
                type={'range'} 
                value={0} 
                callback={(value) => {
                    api.send('setconfig', ['mediapipe', 'PoseLandmarker', 'minPoseDetectionConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'HandLandmarker', 'minHandDetectionConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'FaceLandmarker', 'minFaceDetectionConfidence'], value)
                }}
            />
            <ConfigEntry 
                name={'Presence score treshold'} 
                type={'range'} 
                value={0} 
                callback={(value) => {
                    api.send('setconfig', ['mediapipe', 'PoseLandmarker', 'minPosePresenceConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'HandLandmarker', 'minHandPresenceConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'FaceLandmarker', 'minFacePresenceConfidence'], value)
                }}
            />
            <ConfigEntry 
                name={'Tracking score treshold'} 
                type={'range'} 
                value={0} 
                callback={(value) => {
                    api.send('setconfig', ['mediapipe', 'PoseLandmarker', 'minTrackingConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'HandLandmarker', 'minTrackingConfidence'], value)
                    api.send('setconfig', ['mediapipe', 'FaceLandmarker', 'minTrackingConfidence'], value)
                }}
            /> 
        </ConfigField>
    </div>
*/