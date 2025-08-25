//Module that manages tracker connections
import { console } from '../common/logger.mjs'

export const tracker = {}

tracker.connections = new Map()

const connect = (d) => {
    console.log(d + ' connected')
    tracker.connections.set(d, 'INSERT WS CONNECTION HERE')
}

const disconnect = (d) => {
    console.log(d + ' disconnected')
    tracker.connections.delete(d)
}

tracker.toggle = (device, bool) => {
    bool ? connect(device) : disconnect(device)
}
