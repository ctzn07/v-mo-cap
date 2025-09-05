//worker front-end script

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

//video stream suspension suspended(for example; disconnected device)
//w.video.onsuspend(e => stop(e, 'Video suspended'))