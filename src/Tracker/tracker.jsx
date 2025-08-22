/*
{ 
        PoseLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/pose_landmarker_lite.task',
                modelAssetPath: '', 
                delegate: 'GPU',  //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
            },
        HandLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/hand_landmarker.task',
                modelAssetPath: '', 
                delegate: 'GPU',    //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            },
        FaceLandmarker: {
            baseOptions: {
                //modelAssetPath: '/Assets/0.10.21/task/face_landmarker.task', 
                modelAssetPath: '', 
                delegate: 'GPU',    //options: 'CPU', 'GPU'
            },
            runningMode: 'IMAGE', //options: 'IMAGE', 'VIDEO', 'LIVE_STREAM'
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        }, 
        wasm: ''
    }
*/
