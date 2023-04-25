import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import constants from '../models/constants'
import { setup } from './gradient-map'
import { TerrainGeometry } from '../models/terrain_geometry'

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const clock = new THREE.Clock()

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  3000
)
camera.position.set(0, 500, 700)
camera.lookAt(0, 0, 0)

const scene = new THREE.Scene()

const controls = new MapControls(camera, renderer.domElement)
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
}

const axesHelper = new THREE.AxesHelper(5)
scene.add(axesHelper)

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

function animate() {
  requestAnimationFrame(animate)

  stats.begin()
  const delta = clock.getDelta()
  controls.update(delta)

  renderer.render(scene, camera)
  stats.end()
}

animate()

const gradientMap = setup()

export function drawTerrain(
  blockOffsetX: number,
  blockOffsetZ: number,
  index: number,
  terrain: TerrainGeometry
) {
  const chunkOffsetX = blockOffsetX + constants.CHUNK_WIDTH * (index % 16)
  const chunkOffsetZ =
    blockOffsetZ + constants.CHUNK_WIDTH * Math.floor(index / 16)

  const planeGeom = new THREE.PlaneGeometry(
    constants.CHUNK_WIDTH,
    constants.CHUNK_WIDTH,
    16,
    16
  )
  planeGeom.rotateX(-Math.PI * 0.5)

  for (let i = 0; i < planeGeom.attributes.position.count; i++) {
    ;(planeGeom.attributes.position as THREE.BufferAttribute).setY(
      i,
      terrain.heightMap[i] + terrain.baseHeight
    )
  }

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      gradientMap: { value: gradientMap },
    },
    vertexShader: identityVertex,
    fragmentShader: heatFragment,
  })
  const mesh = new THREE.Mesh(planeGeom, shaderMat)

  const edges = new THREE.EdgesGeometry(planeGeom)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xaaaaaa })
  )

  mesh.position.x += chunkOffsetX
  mesh.position.z += chunkOffsetZ

  line.position.x += chunkOffsetX
  line.position.z += chunkOffsetZ

  scene.add(mesh)
  scene.add(line)
}

const identityVertex = `
  varying float hValue;

  void main()
  {
    hValue = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const heatFragment = `
  uniform sampler2D gradientMap;
  varying float hValue;

  void main() {
    float v = clamp(hValue / 250., 0., 1.);
    vec3 col = texture2D(gradientMap, vec2(0, v)).rgb;
    gl_FragColor = vec4(col, 1.);
  }
`

export function drawTerrainNew(planeGeom: THREE.PlaneGeometry) {
  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      gradientMap: { value: gradientMap },
    },
    vertexShader: identityVertex,
    fragmentShader: heatFragment,
  })

  const mesh = new THREE.Mesh(planeGeom, shaderMat)

  const edges = new THREE.EdgesGeometry(planeGeom)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xaaaaaa })
  )

  scene.add(mesh)
  scene.add(line)
}
