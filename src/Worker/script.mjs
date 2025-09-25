//worker front-end script
import * as Tasks from '@mediapipe/tasks-vision'

//Create video element
const video = document.createElement('video')
video.autoplay = false
video.muted = true

//Create canvas element
const canvas = document.createElement('canvas')
const context = canvas.getContext("2d")
video.onresize = (e) => {
    e.preventDefault()
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
}

//FOR DEBUG USE
document.body.appendChild(video)
document.body.appendChild(canvas)

const landmarkers = []

function getTrack(){ return video.srcObject.getVideoTracks()[0] }

function openStream(label) {
    const constraints = {
        video: {
            //deviceId: id
            aspectRatio: { ideal: 1.778 },
            frameRate: { ideal: 60 },
            facingMode: { ideal: "environment" }
        }
    }

    //NOTE: (software)devices that share identical name cant be identified properly
    navigator.mediaDevices.enumerateDevices()   //list devices
        .then(list => list.find(d => d.kind === 'videoinput' && d.label === label)) //find video input with matching label
        .then(device => constraints.video.deviceId = device.deviceId)   //update deviceId to UserMedia constraints
        .finally(() => { 
            navigator.mediaDevices.getUserMedia(constraints)    //apply constraints
                .then(source => video.srcObject = source)   //set videofeed source
                .finally(() => {
                    video.play()    //play video
                    //TODO? redirect mediastream to canvas using captureStream()???
                    //load mediapipe modules
                    //inform main process load is ready
                })
        })
        .catch(e => console.log('error opening videostream:', e))
}

api.subscribe('startStream', (e, label) => openStream(label))

//video stream suspended(for example; disconnected device)
//video.onsuspend(e => stop(e, 'Video suspended'))

api.subscribe('detect', (e, module) => {
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    //TODO: run Lens Correction
    //NOTE: doing "lens correction" to the tracking data would be more efficient
    //if(landmarkers[module]){
    //    const results = landmarkers[module].detect(canvas, {})
    //}
})

/*
//NOTE: (software)devices that share identical name cant be identified properly
    const devicelist = await navigator.mediaDevices.enumerateDevices()
    const device = devicelist.find(d => d.kind === 'videoinput' && d.label === label)
    if(device){
        //ID is valid, update it to constraints
        constraints.video.deviceId = device.deviceId
        navigator.mediaDevices.getUserMedia(constraints).then(source => video.srcObject = source)
    }
    else{
        console.log('error finding device')
    }
*/