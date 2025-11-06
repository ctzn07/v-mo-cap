import { useEffect, useState, useRef } from 'react'

const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

//TODO: see
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meter
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress

function Custom({ text, path, options, value }){
    const [domElement, setDomElement] = useState(null);
    const container = useRef(null)
    useEffect(() => {
        const importModule = async () => {
            await import(value).then(mod => setDomElement(mod.default))
        }
        importModule()
        container.current.innerHTML = null
        
        container.current.append(domElement)
    }, [])

    return (<div>{text ? text : null}<br /><div ref={ container } /></div>)
}

function Select({ text, path, options, value }){
    const callback = (e, offset) => {
        let index = options.lastIndexOf(value) + offset
        const max = options.length - 1
        index > max ? index = 0 : index < 0 ? index = max : index = index

        api.send('setconfig', path, options[index])
    }

    return <div className='select' ><div style={{marginTop: 'auto', marginBottom: 'auto', width: '100%'}} >{text + ':'}</div>
        <button className='button_small' onClick={e => callback(e, -1)} >{'<'}</button>
            <div className='select_value' style={{marginTop: 'auto', marginBottom: 'auto'}} >{value}</div>
        <button className='button_small' onClick={e => callback(e, 1)} >{'>'}</button>
        <br />
    </div>
}

function Toggle({ text, path, options, value}){
    const callback = (e) => {e.preventDefault(); api.send('setconfig', path, !value)}
    const label = text ? text : options[Number(value)] ? options[Number(value)] : null
    //TODO: if options length is more than 2 and/or text is not provided, toggle settings are wrong
    return (
        <button className='button_large' onClick={e => callback(e)}>
            {label}<br />
            <label className="switch">
                <input type="checkbox" checked={value} readOnly={true} />
                <span className="slider"></span>
            </label>
        </button>
    )
}

function Text({ text, path, options, value }){
    return <div className='frame_content'>{text ? text : null}{value ? value : null}</div>
}

function Frame({ horizontal, children, frameKey }){
    return (
        <div className='frame' style={{display: horizontal ? 'flex' : 'block'}} >
            {children.map((c, i) => getComponentByType(c, i, frameKey))}
        </div>
    )
}

/*Component template:
return {
      type: type, 
      text: text, 
      path: path, //config path will be used to handle setconfig callbacks and showing value
      options: options
    }
*/

function getComponentByType(data, index, id){   //type, text, path, options
    const r_key = id + '_' + data.type + '_' + index
    //console.log('key:', r_key)

    switch (data.type) {
        case 'toggle':
            return <Toggle {...data} key={r_key} />
        case 'text':
            return <Text {...data} key={r_key} />
        case 'select':
            return <Select {...data} key={r_key} />
        case 'custom':
            return <Custom {...data} key={r_key} />
        case 'frame':
            data.frameKey = r_key
            return <Frame {...data} key={r_key} />
        default:
            console.log(`Unknown UI component type: ${type}`)
            return <></>
    }
}

export function Page({ id }){
    const [content, setContent] = useState([])
    useEffect(() => {
        const subscribe = (channel) => {
            api.subscribe(channel, (e, data) => {
                setContent(data.map((d, i) => getComponentByType(d, i, id)))
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