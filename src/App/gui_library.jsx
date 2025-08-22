import { useEffect, useState } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

//TODO: see
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meter
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress


function Toggle({ active, label, apiArgs }){
  return (
    <button onClick={(e) => {e.preventDefault();api.send(...apiArgs)}}>
      {label}<br />
      <label className="switch">
        <input type="checkbox" checked={active} readOnly={true} />
        <span className="slider"></span>
      </label>
    </button>
  )
}

function Device({ device }){
    return <div className='component' key={device.id} >
        <Toggle active={device.Active} label={device.Active ? 'On' : 'Off'} apiArgs={['connect', device]} />
        <div className='component_content'>{device.label}</div>
        <Toggle active={device.Face} label={'Face'} apiArgs={['setconfig', ['Devices', device.label, 'Face'], !device.Face]} />
        <Toggle active={device.Hand} label={'Hand'} apiArgs={['setconfig', ['Devices', device.label, 'Hand'], !device.Hand]} />
        <Toggle active={device.Body} label={'Body'} apiArgs={['setconfig', ['Devices', device.label, 'Body'], !device.Body]} />
    </div>
}

/* config entry data
{
    label: 'Websocket Port', 
    path: ['User', 'WebsocketPort'], 
    options: [443, 8080], 
    value: config.get(['User', 'WebsocketPort'])
}
*/

function ConfigEntry({ label, path, options, value }){
    return (
        <dd>
            {label + ':' + value}
        </dd>
    )
}

function Config({ config }){
    console.log(config)
    return <div className='component' style={{display: 'block'}} >
        <dl className='component_content' >
            <dt>{config.label}</dt>
            {config.options.map((c, index) => (<ConfigEntry label={c.label} path={c.path} options={c.options} value={c.value} key={config.label + '_' + index} />) )}
        </dl>
    </div>
}

function getComponentByType(type, data, index){
    switch (type) {
        case 'Device':
            return <Device device={data} key={type + '_' + index} />
        case 'Config':
            return <Config config={data} key={type + '_' + index} />
        default:
            console.log(`Unknown UI component type: ${type}`)
            break
    }
}

export function Page({ id }){
    const [content, setContent] = useState([])
    useEffect(() => {
        const subscribe = (channel) => {
            api.subscribe(channel, (e, data) => { 
                setContent(data.map((d, i) => getComponentByType(d.type, d.data, i)))
            })
        }
        const cleanup = () => {
            api.unsubscribe(id, subscribe)
        }
        subscribe(id)   //subscribe to UI updates
        api.send('update', id)  //initial update request
        
        return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={id} >{content}</div>)
}

/*
<input type="range" min="0" max="1" step="0.1">

<select>
    <option value="1">1</option>
    <option value="2">2</option>
</select>


*/