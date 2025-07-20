//script for App main GUI
import React from 'react'
import ReactDOM from 'react-dom/client'

function MainWindow({ children }){
    //gather prop data from all of the MainWindow children and pass it to Navigation
    const navList = React.Children.toArray(children).map((c) => c.props)
    return (
        <>
            <div className='nav'><Navigation data={navList}/></div>
            <div id='container'>{children}</div>
        </>
    )
}


const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <React.StrictMode>
        <h1>Hello world</h1>
    </React.StrictMode>
)