import { useEffect, useState, useRef } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

export function Config({ id }){
    const [content, setContent] = useState([])
    useEffect(() => {
        const subscribe = (channel) => {
            api.subscribe(channel, () => {
                //this event fires when relevant data changes in the backend
                //TODO: use config.get to retrieve relevant data
            })
            return this
        }

        
        subscribe(id)   //subscribe to UI updates
        
        return () => api.unsubscribe(id, subscribe)
    }, [])

    return (<>{'this is config page'}</>)
}