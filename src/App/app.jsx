//script for App main GUI
import { StrictMode, Children } from "react"
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

function scrollTo(id){
    document.getElementById(id).scrollIntoView({ block: 'center' })
}

function TabButton({ scrollTarget, label }){
    return <button className='button_large' onClick={ () => {scrollTo(scrollTarget)} }>
            {label}
        </button>
}

function MainWindow({ children }){
    return <>
        <div className='tab' >
            {Children.toArray(children).map((page, index) => {
                return <TabButton key={'tab_' + index} scrollTarget={page.props.id} label={page.props.label} />
            })}
        </div>
        {children}
    </>
}

function Main(){
    const dev = (
        <StrictMode>
            <MainWindow>
                <Sources id='sources' label={'Sources'} />
                <Config id='config' label={'Config'} />
                <Preview id='preview' label={'Preview'} />
            </MainWindow>
        </StrictMode>)

    const prod = (
        <MainWindow>
            <Sources id='sources' label={'Sources'} />
            <Config id='config' label={'Config'} />
            <Preview id='preview' label={'Preview'} />
        </MainWindow>
    )
    return isDev ? dev : prod
}

root.render(<Main/>)