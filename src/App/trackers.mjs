//Module that manages tracker connections
import { console } from '../common/logger.mjs'

export const tracker = {}

tracker.connections = new Map()

//TODO: manage websocket connections

const connect = (d) => {
    console.log(d.label + ' connected')
    //TODO: create new tracker instance
    tracker.connections.set(d.label, 'INSERT WS CONNECTION HERE')
}

const disconnect = (d) => {
    //TODO: bind this function to ws disconnection event
    console.log(d.label + ' disconnected')
    tracker.connections.delete(d.label)
}

tracker.toggle = (device) => {
    if(device){ tracker.connections.has(device.label) ? disconnect(device) : connect(device) }
    else { console.error('No device provided for tracker.connect') }
}