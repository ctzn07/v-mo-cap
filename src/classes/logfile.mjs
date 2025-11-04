import fs from 'node:fs'
import util from 'node:util'
import { isDev } from '../common/util.mjs'

export class Logger{
    constructor(filepath){
        this.stream = fs.createWriteStream(filepath, {flags : 'a', encoding: 'utf-8', autoClose: true})
        this.log = (...e) => {
            let message = this.shortTime() + ' LOG - '
            for(const a of e){
                this.stringify(a) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message)
        }
        this.error = (...e) => {
            let message = this.shortTime() + ' ERROR - '
            for(const a of e){
                this.stringify(a) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message)
        }
        this.print = (...e) => {
            let message = this.shortTime() + ' PRINT - '
            for(const a of e){
                this.stringify(a) ? message += JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message, false)
        }
    }

    shortTime(){
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

    stringify(a){
        return Boolean(a instanceof Object && a.constructor === Array)
    }

    write(msg, writelog = true){
        if(isDev())process.stdout.write(util.format(msg) + '\n')
        if(writelog)this.stream.write(util.format(msg) + '\n')
    }
}