import { useEffect, useState, useRef } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

function NewSource(){
    const callback = (e) => {e.preventDefault(); api.send('addSource')}
    //TODO: if options length is more than 2 and/or text is not provided, toggle settings are wrong
    return (<button className='button_large' onClick={e => callback(e)}>{'+ New Source'}<br /></button>)
}

function RemoveSource({ source_id }){
    const callback = (e) => {e.preventDefault(); api.send('removeSource', source_id)}
    return (
        <button className='button_small' onClick={e => callback(e)}>{'X'}</button>
    )
}

function TypeList(){
    return (
    <label>
      Select input type:
      <select name="inputType">
        <option value="device">Device</option>
        <option value="network">Network</option>
      </select>
    </label>
  )
}

function DeviceList(){

}

function Source({data}){
    return (
        <div className='frame' >
            <TypeList />
            <div className='frame_content'>{`this is a source entry for ${data.id}`}</div>
            <RemoveSource source_id={data.id} />
        </div>
    )
}

export function SourceList({ id }){
    const [content, setContent] = useState([])
    //request data from main process
    const request = () => api.request('get', 'session/Sources')
        .then((sources) => {
            const sourcelist = Object.keys(sources || {})
            const entries = sourcelist.map((s, i) => <Source data={sources[s]} key={`s_entry_${i}`} /> )
            setContent(entries)
        })
        .catch(e => api.send('error', `Sources GUI: ${e}`))

    useEffect(() => {
        //subscribe to relevant data changes in the main process
        const subscribe = (channel) => api.subscribe(channel, () => request())
        
        subscribe(id)   //subscribe to UI updates
        request()
        
        return () => api.unsubscribe(id, subscribe)
    }, [])

    return (<><NewSource />{content}</>)
}