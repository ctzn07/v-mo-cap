//script for App main GUI
import { StrictMode, Children } from "react"
import { createRoot } from 'react-dom/client'

import { Page } from './gui_library'

const root = createRoot(document.getElementById('root'))

const isDev = process.env.NODE_ENV === 'development'

//enumerate media devices with videoinput type
function devicelist(callback){  
  navigator.mediaDevices.enumerateDevices()
    .then(devicelist => devicelist.filter(device => device.kind === 'videoinput'))
    .then(list => callback(list.map(d => d.toJSON())))
    .catch(e => console.error(e))
}

let timegate = null //do not declare inside component

//Device change event
navigator.mediaDevices.ondevicechange = () => {
    //ondevicechange() triggers multiple times for some devices
    //use timeout to only trigger on last event
    clearTimeout(timegate)
    timegate = setTimeout(() => devicelist((list) => api.send('devicelist', list.map(d => d.label))), 100)
}
navigator.mediaDevices.ondevicechange() //call initial update

function TabButton({ scrollTarget, label }){
    return <button className='button_large' onClick={ () => {document.getElementById(scrollTarget).scrollIntoView({ block: 'center' })} }>{label}</button>
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
                <Page id='devices' label={'Devices'} />
                <Page id='config' label={'Config'} />
                <Page id='preview' label={'Preview'} />
            </MainWindow>
        </StrictMode>)

    const prod = (
        <MainWindow>
            <Page id='devices' label={'Devices'} />
            <Page id='config' label={'Config'} />
            <Page id='preview' label={'Preview'} />
        </MainWindow>
    )
    return isDev ? dev : prod
}

root.render(<Main/>)