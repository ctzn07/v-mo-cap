//script for App main GUI
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import './css/global.css'

import Devices from './devices'

const root = createRoot(document.getElementById('root'))

//scrolls the page into view
const scrollIntoView = (id) => document.getElementById(id)?.scrollIntoView({ inline: 'center' })

function Navigation(props) {
    const pages = []
    //todo?: replace page.displayName with icon
    if(props.pages instanceof Object){
        for(const page of props.pages){
            pages.push(
                <button key={page.id} onClick={scrollIntoView(page.id)}>
                    <img src={props.icon}/>{page.displayName}
                </button>
            )
        }
    }
    return pages
}

function Main({ children }){
    //gather prop data from all of the MainWindow children and pass it to Navigation
    return (
        <>
            <div className='nav'>
                <Navigation pages={React.Children.toArray(children).map((c) => c.props)}/>
            </div>
            <div id='container'>{children}</div>
        </>
    )
}

root.render(
    <React.StrictMode>
        <Main>
            <Devices displayName={'Devices'} id={'devices'}/>
        </Main>
    </React.StrictMode>
)