//Module that manages tracker connections
import { console } from '../common/logger.mjs'
import { config } from '../common/config.mjs'

export const tracker = {}

tracker.connections = new Map()

//TODO: manage websocket connections

tracker.connect = (d) => {
    console.log(d + ' connected')
    //TODO: create new tracker instance
    tracker.connections.set(d, 'INSERT WS CONNECTION HERE')
}

tracker.disconnect = (d) => {
    //TODO: bind this function to ws disconnection event
    console.log(d + ' disconnected')
    tracker.connections.delete(d)
}
