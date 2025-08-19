const style = window.getComputedStyle(document.body)
//style.getPropertyValue('value name')
const primary_color = style.getPropertyValue('--primary-color')
const secondary_color = style.getPropertyValue('--secondary-color')

export function ToggleButton({ labels, active, callback }){
    return <button 
        onClick={e => { e.preventDefault(); callback(!active) }}>
        {active ? labels[0] : labels[1] ? labels[1] : labels[0]}<br/>
        <label className="switch">
            <input type="checkbox" checked={active} readOnly={true} />
            <span className="slider"></span>
        </label>
    </button>
}

//TODO: see
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meter
//https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress

export function DeviceStatusText({ device }){
    return device.status.map((s, i) => {
        return <div key={device.id + '_statusText_' + i} className='status_text' >
                    <div style={{display:'flex', minWidth: '100px', fontSize: 'small'}} >{'- ' + s.label}
                        <div style={{width:'100%', textAlign: 'right', fontSize: 'small'}}>{s.value}</div>
                        <div style={{minWidth: '20px', textAlign: 'left', fontSize: 'small'}}>{s.unit}</div>
                    </div>
                </div>
    })
}
/* Device template(see deviceDataTemplate @ app.mjs line 21)
{
  label: string, 
  id: string, 
  active: boolean, 
  modules: {
    FaceLandmarker: boolean, 
    Handlandmarker: boolean, 
    Poselandmarker: boolean
  }, 
  status: {
        fps: {
          label: 'Framerate', 
          value: 5, 
          min: 0, 
          max: 30, 
          unit:'fps'},  //todo: make system that monitors performance
        error: {
          label: 'Accuracy', 
          value: 0, 
          min: 0, 
          max: 100, 
          unit:'%'}, //todo: make system that monitors tracking errors
      }
}
*/

export function ConfigField({ label, children }){
    return <div className='component' >
        <div className="component_label" >{label}</div>
        <div style={{display: 'block', paddingLeft: 'inherit', paddingRight: 'inherit', width: '100%'}} >{children}</div>
    </div>
}

export function ConfigEntry({ name, type, value, callback }){
    switch (type) {
        case 'range':
            return <div style={{paddingTop: '8px', display: 'flex'}}>
                {name}<div style={{float: 'right'}}></div>
                    <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.05} 
                        value={value} 
                        onChange={e => callback(Number(e.target.value))} 
                    />
            </div>
        case 'select':
            return <div>
                {'select placeholder'}
            </div>
    
        default:
            return null
    }
}
/*
<input type="range" min="0" max="1" step="0.1">

<select>
    <option value="1">1</option>
    <option value="2">2</option>
</select>


*/