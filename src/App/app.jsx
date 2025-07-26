//script for App main GUI
import { StrictMode } from "react"
import { createRoot } from 'react-dom/client'

import Devices from './devices'
import Preview from './preview'
import Config from './config'

const root = createRoot(document.getElementById('root'))

function TabButton(props){
    return <button onClick={ () => {document.getElementById(props.scrollTarget).scrollIntoView({ block: 'center' })} }>{props.text}</button>
}

function Main(){
    return (
        <>
            <div className='tab'>
                <TabButton scrollTarget={'devices'} text={'Devices'}/>
                <TabButton scrollTarget={'config'} text={'Config'}/>
                <TabButton scrollTarget={'preview'} text={'Preview'}/>
            </div>
            <Devices id='devices'/>
            <Config id='config'/>
            <Preview id='preview'/>
        </>
    )
}

root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
)