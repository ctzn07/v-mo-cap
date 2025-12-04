export function isDev(){ return process.env.NODE_ENV === 'development' }

export function platform() { return process.platform } //returns 'darwin', 'win32' or 'linux'

export function shortID() { return crypto.randomUUID().split('-').at(-1)}