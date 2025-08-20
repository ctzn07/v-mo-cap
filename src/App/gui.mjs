//Module for formatting data to UI 
import { config } from '../common/config.mjs'
import { tracker } from './trackers.mjs'

export const gui = {}

const devices = []  //list of active devices for the UI

const deviceDataTemplate = (c) => {
    //formats the device config data for UI
    return {
        label: c.label, 
        id: c.deviceId, 
        active: tracker.connections.has(c.label), //does device have active connection
        modules: c.modules, 
        status: [
            { //todo: make system that monitors performance
                label: 'Framerate', 
                value: 5, 
                min: 0, 
                max: 30, 
                unit:'fps'
            }, 
            { //todo: make system that monitors tracking errors
                label: 'Accuracy', 
                value: 0, 
                min: 0, 
                max: 100, 
                unit:'%'
            }, 
        ]
    }
}

const configDataTemplate = () => {
    //formats config options for the UI
    return [
      {
        label: 'User settings', 
        options: [
          {
            label: 'Websocket port', 
            path: ['user', 'tracker_port'], 
            type: ['select', 443, 8080], 
            value: config.get(['user', 'tracker_port'])
          }, 
          {
            label: 'Preferred GPU', 
            path: ['user', 'preferredGPU'], 
            type: ['select', 'dGPU', 'iGPU'], 
            value: config.get(['user', 'preferredGPU'])
          }, 
        ]
      },
      {
        label: 'Face tracking', 
        options: [
          {
            label: 'Detection confidence', 
            path: ['mediapipe', 'FaceLandmarker', 'minFaceDetectionConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'FaceLandmarker', 'minFaceDetectionConfidence'])
          }, 
          {
            label: 'Presence confidence', 
            path: ['mediapipe', 'FaceLandmarker', 'minFacePresenceConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'FaceLandmarker', 'minFacePresenceConfidence'])
          }, 
          {
            label: 'Tracking confidence', 
            path: ['mediapipe', 'FaceLandmarker', 'minTrackingConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'FaceLandmarker', 'minTrackingConfidence'])
          }, 
          {
            label: 'Detection hardware', 
            path: ['mediapipe', 'FaceLandmarker', 'baseOptions', 'delegate'], 
            type: ['select', 'GPU', 'CPU'], 
            value: config.get(['mediapipe', 'FaceLandmarker', 'baseOptions', 'delegate'])
          }, 
        ]
      }, 
      {
        label: 'Hand tracking', 
        options: [
          {
            label: 'Detection confidence', 
            path: ['mediapipe', 'HandLandmarker', 'minHandDetectionConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'HandLandmarker', 'minHandDetectionConfidence'])
          }, 
          {
            label: 'Presence confidence', 
            path: ['mediapipe', 'HandLandmarker', 'minHandPresenceConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'HandLandmarker', 'minHandPresenceConfidence'])
          }, 
          {
            label: 'Tracking confidence', 
            path: ['mediapipe', 'HandLandmarker', 'minTrackingConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'HandLandmarker', 'minTrackingConfidence'])
          }, 
          {
            label: 'Detection hardware', 
            path: ['mediapipe', 'HandLandmarker', 'baseOptions', 'delegate'], 
            type: ['select', 'GPU', 'CPU'], 
            value: config.get(['mediapipe', 'HandLandmarker', 'baseOptions', 'delegate'])
          }, 
        ]
      }, 
      {
        label: 'Body tracking', 
        options: [
          {
            label: 'Detection confidence', 
            path: ['mediapipe', 'PoseLandmarker', 'minPoseDetectionConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'PoseLandmarker', 'minPoseDetectionConfidence'])
          }, 
          {
            label: 'Presence confidence', 
            path: ['mediapipe', 'PoseLandmarker', 'minPosePresenceConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'PoseLandmarker', 'minPosePresenceConfidence'])
          }, 
          {
            label: 'Tracking confidence', 
            path: ['mediapipe', 'PoseLandmarker', 'minTrackingConfidence'], 
            type: ['range', 0, 1], 
            value: config.get(['mediapipe', 'PoseLandmarker', 'minTrackingConfidence'])
          }, 
          {
            label: 'Detection hardware', 
            path: ['mediapipe', 'PoseLandmarker', 'baseOptions', 'delegate'], 
            type: ['select', 'GPU', 'CPU'], 
            value: config.get(['mediapipe', 'PoseLandmarker', 'baseOptions', 'delegate'])
          }, 
        ]
      }
    ]
  }

gui.devices = (list) => {
    if(list){
        devices.length = 0  //if list argument was provided, clear the existing data
        //for each device in list, fetch config data for it, then format it for UI
        for(const d of list){ devices.push(deviceDataTemplate(config.device(d.label)))}
    }
    else{
        //no list argument provided, refresh existing list
        devices.forEach((d, i) => devices[i] = deviceDataTemplate(config.device(d.label)))
    }
    return devices
}

gui.config = () => {
    return configDataTemplate()
}