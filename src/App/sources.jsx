import { useEffect, useState, useRef } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

function NewSource(){
    const callback = (e) => {e.preventDefault(); api.send('addSource')}
    //TODO: if options length is more than 2 and/or text is not provided, toggle settings are wrong
    return (
        <div className='nav_margin' >
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
        <div className='frame' style={{display: 'block'}}  >
            <div className='frame_content'>{data.label}{`(${data.id})`}</div>
            {`this is a source entry for ${data.label}`}
            <br />
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
        const cleanup = () => { api.unsubscribe(id, subscribe) }
        subscribe(id)   //subscribe to UI updates
        
        return cleanup
    }, [])

    return (
        <div className={'page anim_fade'} id={id} >
            <NewSource />
            {content}
        </div>
    )
}