//script for App main GUI
import { StrictMode } from "react"
import { createRoot } from 'react-dom/client'

import Devices from './devices'
import Preview from './preview'
import Config from './config'

const root = createRoot(document.getElementById('root'))
////document.getElementById(ref)?.scrollIntoView({ block: 'center' })

function TabButton(props){
    return <button onClick={ () => {document.getElementById(props.scrollTarget).scrollIntoView({ block: 'center' })} }>{props.text}</button>
}

function Main(){
    return (
        <>
            <div className='tab'>
                <TabButton scrollTarget={'devices'} text={'Devices'}/>
                <TabButton scrollTarget={'preview'} text={'Preview'}/>
                <TabButton scrollTarget={'config'} text={'Config'}/>
            </div>
            <Devices id='devices'/>
            <Preview id='preview'/>
            <Config id='config'/>
        </>
    )
}


root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
)