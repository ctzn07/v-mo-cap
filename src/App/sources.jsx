import { useEffect, useState, useRef } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

function NewSource(){
    const callback = (e) => {e.preventDefault(); api.send('addSource')}
    //TODO: if options length is more than 2 and/or text is not provided, toggle settings are wrong
    return (
        <div className='frame' >
                <button className='button_large' onClick={e => callback(e)}>
                    {'+ New Source'}<br />
                </button>
        </div>
    )
}

function RemoveSource({ source_id }){
    const callback = (e) => {e.preventDefault(); api.send('removeSource', source_id)}
    return (
        <button className='button_small' onClick={e => callback(e)}>
            {'X'}
        </button>
    )
}

function SourceEntry({data}){
    return (
        <div className='frame' style={{display: 'flex'}}  >
            <div className='frame_title'>{data.label}</div>
            <div className='frame_content'>{`this is a source entry for ${data.id}`}</div>
            <RemoveSource source_id={data.id} />
        </div>
    )
}

export function Sources({ id }){
    const [content, setContent] = useState([])
    useEffect(() => {
        const subscribe = (channel) => {
            //subscribe to relevant data changes in the main process
            api.subscribe(channel, () => {
                //request data from main process
                api.request('get', 'session/Sources')
                    .then((sources) => {
                        const sourcelist = Object.keys(sources || {})
                        const entries = sourcelist.map((s, i) => <SourceEntry data={sources[s]} key={`s_entry_${i}`} /> )
                        setContent(entries)
                    })
                    .catch(e => api.send('error', `Sources GUI: ${e}`))
            })
        }
        
        subscribe(id)   //subscribe to UI updates
        
        return () => api.unsubscribe(id, subscribe)
    }, [])

    return (<><NewSource />{content}</>)
}