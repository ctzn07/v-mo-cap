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
    const statusObjects = Object.keys(device.performance).map(k => device.performance[k])
    console.log(statusObjects)

    return statusObjects.map((s, i) => {
        return <div key={device.id + '_statusText_' + i} className='status_text' >
                    <div style={{display:'flex', minWidth: '100px', fontSize: 'small'}} >{'- ' + s.label}
                        <div style={{width:'100%', textAlign: 'right', fontSize: 'small'}}>{s.value}</div>
                        <div style={{minWidth: '20px', textAlign: 'left', fontSize: 'small'}}>{s.unit}</div>
                    </div>
                </div>
    })
}
//<div style={{display: 'flex'}} >{s.label}<div style={{width: '100%', textAlign:'right'}}>{s.value + ' ' + s.unit}</div>