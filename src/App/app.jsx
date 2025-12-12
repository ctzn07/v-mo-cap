//script for App main GUI
import { StrictMode, Children, useState } from "react"
import { createRoot } from 'react-dom/client'

import { SourceList } from './sources.jsx'
import { Config } from "./config.jsx"
import { Preview } from './preview.jsx'

const root = createRoot(document.getElementById('root'))

const isDev = process.env.NODE_ENV === 'development'

//enumerate media devices with videoinput type
function devicelist(callback){  
  navigator.mediaDevices.enumerateDevices()
    .then(devicelist => devicelist.filter(device => device.kind === 'videoinput'))
    .then(list => callback(list.map(d => d.toJSON())))
    .catch(e => console.error(e))
}

//Device change event
navigator.mediaDevices.ondevicechange = () => {
    devicelist((list) => api.send('devicelist', list.map(d => d.label)))
}
navigator.mediaDevices.ondevicechange() //call initial update

const pages = [
    <SourceList id='sources' label={'Sources'} />, 
    <Config id='config' label={'Config'} />, 
    <Preview id='preview' label={'Preview'} />
]

function Window({ children }){
    //create initial array or page order [1, 2, 3...]
    const [pageOrder, setPageOrder] = useState([...Array(pages.length).keys()])

    const reOrder = (index) => {
        //set desired index to first
        pageOrder.unshift(index)
        //remove duplicates by set conversion, spread back to array
        const newOrder = [...new Set(pageOrder)]
        console.log('new page order', newOrder)
        setPageOrder(newOrder)
    }
    
    const navButtons = []
    pages.forEach((p, i) => {
        navButtons.push(<button key={'nav_' + i} onClick={() => reOrder(i)}>{p.props.label}</button>)
    })

    //const customStyle = (i) => {return {transform: `translate(${i*500*-1}px, 0px)`}}
    const customStyle = (i) => {return i ? {opacity: '0', transform: 'translate(-100px, 0px)', zIndex: -1} : {opacity: '1', transform: 'translate(0px, 0px)', zIndex: 0}}
    
    //anim_expand : anim_shrink
    return (<div style={{display: 'flex', height: '100%'}}>
        <div className='navigation'>{navButtons}</div>
        <div className='page_wrapper'>{pageOrder.map((index, i) => {
            return <div className='page' style={customStyle(i)} id={pages[index].props.id} key={`page_${index}`} > {pages[index]} </div>
        })}</div>
        
    </div>)
}
//<div className={'page anim_expand'} id={pages[pageOrder[0]].props.id}>{pages[pageOrder[0]]}</div>

function Main(){
    const dev = (
        <StrictMode>
            <Window />
        </StrictMode>
    )

    const prod = ( <Window /> )
    return isDev ? dev : prod
}

root.render(<Main/>)