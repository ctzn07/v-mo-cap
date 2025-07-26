//Device list component
import { useEffect, useState } from 'react'

//override default console.log() with ../common/logger.mjs(see definition in preload script)
console.log = api.log

//enumerate media devices with videoinput type 
const devicelist = (callback) => {
    navigator.mediaDevices.enumerateDevices()
    .then(dlist => dlist.filter(md => md.kind === 'videoinput'))
    .then(list => callback(list.map(d => d.toJSON())))
    .catch(e => console.log(e))
}

console.log('looking for devices...')
devicelist(console.log)

function Devices(props){
    
    return (<div className={'page anim_fade'} id={props.id} >{'devices component'}</div>)
}

export default Devices