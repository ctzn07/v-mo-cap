import * as THREE from '../../node_modules/three'
//import { OrbitControls } from './three/addons/controls/OrbitControls.js'
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const css_colors = {
  //--primary-color
  //--secondary-color
  //--accent-color
  //--text-color
  primary: window.getComputedStyle(document.body).getPropertyValue('--primary-color'),
  secondary: window.getComputedStyle(document.body).getPropertyValue('--secondary-color'),
  accent: window.getComputedStyle(document.body).getPropertyValue('--accent-color'),
  text: window.getComputedStyle(document.body).getPropertyValue('--text-color')
}

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(css_colors.text, -35, 150)
const camera = new THREE.PerspectiveCamera(75, null, 0.1, 500)
const clock = new THREE.Clock()
clock.autoStart = true
let deltatime = 0

//shorthand helpers
const Vec3 = (x = 0, y = 0, z = 0) => {return new THREE.Vector3(x,y,z)}
const Deg = (angle) => {return THREE.MathUtils.degToRad(angle)}

//new WebGL renderer, background { alpha: true }
const renderer = new THREE.WebGLRenderer({ alpha: true })

/*
export default function DomElement(){
    return renderer.domElement
}*/

export default renderer.domElement

//change scene orientation to Z-Up
scene.rotateOnWorldAxis(Vec3(1,0,0), Deg(-90))

//orbit controls 
//const controls = new OrbitControls(camera, renderer.domElement)
//initial camera position
camera.position.set(-3,5,8)
//controls.update()

//parent react component controls the renderer size
function setRenderSize(width, height){
  //console.log(width, height)
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

//Floor grid lines
const grid = {
  x: 10, 
  y: 10,
  lines: [], 
}
scene.remove(...grid.lines)

const MAT_line_secondary = new THREE.LineBasicMaterial({color: css_colors.secondary})

//X-Axis lines
for (let x = grid.x/2*-1; x <= grid.x/2; x++) {
  const from = Vec3(x, grid.y/2, 0)
  const to = Vec3(x, grid.y/2*-1, 0)
  grid.lines.push(new THREE.BufferGeometry().setFromPoints([from, to]))
}
//Y-Axis lines
for (let y = grid.y/2*-1; y <= grid.y/2; y++) {
  const from = Vec3(grid.x/2, y, 0)
  const to = Vec3(grid.x/2*-1, y, 0)
  grid.lines.push(new THREE.BufferGeometry().setFromPoints([from, to]))
}
//add lines to scene
grid.lines.forEach(line => scene.add( new THREE.Line(line, MAT_line_secondary)))
//end of floor grid

//axis helper
const axesHelper = new THREE.AxesHelper(1)
  .translateX(grid.x/2*-1)
  .translateY(grid.y/2*-1)
  .translateZ(0.01)
scene.add( axesHelper )

function previewData(data){
  //draw tracking data particles here
}

//animation loop
function animate() {
  deltatime = clock.getDelta()
  renderer.render( scene, camera )
}
animate()
renderer.setAnimationLoop( animate )