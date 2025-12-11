//script for App main GUI
import { StrictMode, Children, useState } from "react"
import { createRoot } from 'react-dom/client'

import { Sources } from './sources.jsx'
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

const TABS = {
    sources: <Sources id='sources' label={'Sources'} />, 
    config: <Config id='config' label={'Config'} />, 
    preview: <Preview id='preview' label={'Preview'} />
}

function MainWindow({ children }){
    const [tab, setTab] = useState('sources')
    const navButtons = []
    Object.keys(TABS).forEach((p, i) => {
        navButtons.push(<button key={'nav_' + i} onClick={() => setTab(p)}>{TABS[p].props.label}</button>)
    })

    /*
    const navButtons = pages.map((page, index) => {
                console.log(`creating nav button for ${page.props.id}`)
                return <button key={'nav_' + index} onClick={() => { setSelectedTab(page.props.id)} }>{page.props.label}</button>
            })
    */
    return (<>
        <div className='navigation'>{navButtons}</div>
        <div className={'page anim_fade'} id={tab}>{TABS[tab]}</div>
    </>)
}

function Main(){
    const dev = (
        <StrictMode>
            <MainWindow />
        </StrictMode>)

    const prod = ( <MainWindow /> )
    return isDev ? dev : prod
}

root.render(<Main/>)