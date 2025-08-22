//Config menu component
import { useEffect, useState } from 'react'

function Configs({ config }){
    //console.log(config)
    return <div>{'this is config entry'}</div>
}

//TODO: arrow selector to switch config values between options
// <| value |>

function Config(props){
    const [configs, setConfigs] = useState([])

    useEffect(() => {
      const subscribe = (channel) => {
        //subscribe to UI update event
        api.subscribe(channel, (e, data) => { 
          setConfigs(data.map((c, i) => { return <Configs config={c} key={'config_' + i} /> })) 
        })
      }
      const cleanup = () => { api.unsubscribe('config', subscribe) }
      subscribe('config') //subscribe to config updates
      api.send('update-request', 'config')
      
      return cleanup
    }, [])

    return (<div className={'page anim_fade'} id={props.id} >{configs}</div>)
}


export default Config