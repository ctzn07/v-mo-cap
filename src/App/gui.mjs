//Module for formatting data to UI 
import { config } from '../common/config.mjs'

export const gui = {}

const device_list = []  //list of active devices for the UI

const deviceDataTemplate = () => {
  //formats the device config data for UI
  return device_list.map((d) => { return { type: 'Device', data: d } })
}

const rangeoptions = [
  0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 
  0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 
  0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]

const configDataTemplate = () => {
  console.log('config template requested')
  //formats config options for the UI
  return [
    {
      type: 'Config', 
      data: {
        label: 'User Settings', 
        options: [
          {
            label: 'Websocket Port', 
            path: ['User', 'WebsocketPort'], 
            options: [443, 8080], 
            value: config.get(['User', 'WebsocketPort'])
          }, 
          {
            label: 'Preferred GPU', 
            path: ['User', 'PreferredGPU'], 
            options: ['dGPU', 'iGPU'], 
            value: config.get(['User', 'PreferredGPU'])
          },  
        ]
      },
    }, 
    {
      type: 'Config', 
      data: {
        label: 'Face Tracking', 
        options: [
          {
            label: 'Hardware', 
            path: ['Tracking', 'Face', 'Hardware'], 
            options: ['CPU', 'GPU'], 
            value: config.get(['Tracking', 'Face', 'Hardware'])
          }, 
          {
            label: 'Tracking Confidence', 
            path: ['Tracking', 'Face', 'TrackingConfidence'], 
            options: rangeoptions, 
            value: config.get(['Tracking', 'Face', 'TrackingConfidence'])
          }, 
        ]
      }
    }, 
    {
      type: 'Config', 
      data: {
        label: 'Hand Tracking', 
        options: [
          {
            label: 'Hardware', 
            path: ['Tracking', 'Hand', 'Hardware'], 
            options: ['CPU', 'GPU'], 
            value: config.get(['Tracking', 'Hand', 'Hardware'])
          }, 
          {
            label: 'Tracking Confidence', 
            path: ['Tracking', 'Hand', 'TrackingConfidence'], 
            options: rangeoptions, 
            value: config.get(['Tracking', 'Hand', 'TrackingConfidence'])
          }, 
        ]
      }
    }, 
    {
      type: 'Config', 
      data: {
        label: 'Body tracking', 
        options: [
          {
            label: 'Hardware', 
            path: ['Tracking', 'Body', 'Hardware'], 
            options: ['CPU', 'GPU'], 
            value: config.get(['Tracking', 'Body', 'Hardware'])
          }, 
          {
            label: 'Tracking Confidence', 
            path: ['Tracking', 'Body', 'TrackingConfidence'], 
            options: rangeoptions, 
            value: config.get(['Tracking', 'Body', 'TrackingConfidence'])
          },  
        ]
      }
    }, 
  ]
}

gui.devices = (list) => {
  //Note: list argument is just device labels
  if(list){
      device_list.length = 0  //if list argument was provided, clear the existing data
      for(const d of list){ device_list.push(config.device(d)) }
  }
  else{
      //no list argument provided, refresh existing list
      device_list.forEach((d, i) => { device_list[i] = config.device(d.label) })
  }
  return deviceDataTemplate(device_list)
}

gui.config = () => {
    return configDataTemplate()
}