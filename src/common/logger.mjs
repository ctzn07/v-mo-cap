import { app } from 'electron'
import fs from 'node:fs'
import util from 'node:util'
import path from 'path'

//const log_path = path.join(app.getAppPath(), '')
const log_path = './console.log'

const streamOptions = {flags : 'w', encoding: 'utf-8', autoClose: true}

const logStream = fs.createWriteStream(log_path, streamOptions)

export const console = {}

function shortTime(){
  const format = {
    //day: '2-digit', 
    //month: '2-digit', 
    //year: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    fractionalSecondDigits: '3', 
  }
  const systemLocale = 'en-GB'  //app.getPreferredSystemLanguages()[0] || 'en-GB'
  return  new Intl.DateTimeFormat(systemLocale, format).format(new Date())
}

console.log  = (...e) => {
  let message = shortTime() + ' LOG - '
  for(const a of e){
    (a instanceof Object) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  logStream.write(util.format(message) + '\n')
  process.stdout.write(util.format(message) + '\n')
}

console.error = (...e) => {
  let message = shortTime() + ' ERROR - '
  for(const a of e){
    (a instanceof Object) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  logStream.write(util.format(message) + '\n')
  process.stdout.write(util.format(message) + '\n')
}

console.print = (...e) => {
  let message = shortTime() + ' PRINT - '
  for(const a of e){
    (a instanceof Object) ? message += JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  process.stdout.write(util.format(message) + '\n')
}