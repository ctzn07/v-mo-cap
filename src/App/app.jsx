//script for App main GUI
import { useRef, StrictMode } from "react";
import { createRoot } from 'react-dom/client'

import Devices from './devices'
import Preview from './preview'
import Config from './config'

const root = createRoot(document.getElementById('root'))
////document.getElementById(ref)?.scrollIntoView({ block: 'center' })

function TabButton(props){
    return <button onClick={ () => {document.getElementById(props.id).scrollIntoView({ block: 'center' })} }> {props.name} </button>
}

function Main(){
    return (
        <>
            <div className='tab'>
                <TabButton id={'devices'} name={'Devices'}/>
                <TabButton id={'preview'} name={'Preview'}/>
                <TabButton id={'config'} name={'Config'}/>
            </div>
            <Devices/>
            <Preview/>
            <Config/>
        </>
    )
}


root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
)