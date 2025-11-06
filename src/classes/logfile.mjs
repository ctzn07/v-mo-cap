import fs from 'node:fs'
import util from 'node:util'
import { isDev } from '../common/util.mjs'

export class Logger{
    constructor(identifier = ''){
        this.id = identifier
        this.stream = this.createStream('./console.log')
        this.log = (...e) => {
            let message = `${this.shortTime()} LOG (${this.id}) - `
            for(const a of e){
                this.stringify(a) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message)
        }
        this.error = (...e) => {
            let message = `${this.shortTime()} ERROR (${this.id}) - `
            for(const a of e){
                this.stringify(a) ? message += '\n' + JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message)
        }
        this.print = (...e) => {
            let message = `${this.shortTime()} PRINT (${this.id}) - `
            for(const a of e){
                this.stringify(a) ? message += JSON.stringify(a, null, 2) + ' ' : message += a + ' '
            }
            this.write(message, false)
        }
    }

    createStream(path){
        //fs file exists -> create file if not
        if(!fs.existsSync(path))try {
            fs.writeFileSync(path)
            return fs.createWriteStream(path, {flags : 'a', encoding: 'utf-8', autoClose: true})
        } catch (error) {
            this.write('ERROR - Logger failed to write logfile', false)
            return false
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
        if(writelog && this.stream)this.stream.write(util.format(msg) + '\n')
    }
}