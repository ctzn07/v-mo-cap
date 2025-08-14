import { useEffect, useState } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

export function ToggleButton({ labels, active, callback }){
    //const [value, setValue] = useState(values[0])
    return <button 
        onClick={e => { e.preventDefault(); callback(!active) }}>
        {active ? labels[0] : labels[1] ? labels[1] : labels[0]}<br/>
        <label className="switch">
            <input type="checkbox" checked={active} readOnly={true} />
            <span className="slider"></span>
        </label>
    </button>
}

export function DeviceStatusText({ device }){
    return Object.keys(device.performance).map((entry, index) => {return (<div key={device.id + '_statusText_' + index}>{entry + ':' + device.performance[entry]}<br/></div>)})
}