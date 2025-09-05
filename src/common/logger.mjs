import fs from 'node:fs'
import util from 'node:util'
import { isDev } from './util.mjs'

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

const log_path = './console.log'


const streamOptions = {flags : 'w', encoding: 'utf-8', autoClose: true}

const logStream = fs.createWriteStream(log_path, streamOptions)

export const console = {}

function write(msg, writelog = true){
  if(isDev())process.stdout.write(util.format(msg) + '\n')
  if(writelog)logStream.write(util.format(msg) + '\n')
}

console.log  = (...e) => {
  let message = shortTime() + ' LOG - '
  for(const a of e){
    (a instanceof Object) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  write(message)
}

console.error = (...e) => {
  let message = shortTime() + ' ERROR - '
  for(const a of e){
    (a instanceof Object) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  write(message)
}

console.print = (...e) => {
  let message = shortTime() + ' PRINT - '
  for(const a of e){
    (a instanceof Object) ? message += JSON.stringify(a, null, 2) + ' ' : message += a + ' '
  }
  write(message, false)
}