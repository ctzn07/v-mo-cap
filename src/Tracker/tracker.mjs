import { app, BrowserWindow } from 'electron'
import { console } from '../common/logger.mjs'

export default function initTracker(args){
  console.log('Tracker Class initialized')
  console.log('Arguments:', args)
}