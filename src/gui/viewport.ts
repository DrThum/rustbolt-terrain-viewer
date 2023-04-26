import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
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

  // console.log(renderer.info.render)
  stats.end()
}

animate()

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
  uniform float darkeningFactor;
  varying float hValue;

  void main() {
    float v = clamp(hValue / 250., 0., 1.);
    vec3 col = texture2D(gradientMap, vec2(0, v)).rgb * vec3(darkeningFactor, darkeningFactor, darkeningFactor);
    gl_FragColor = vec4(col, 1.);
  }
`

const gradientMap = setup()

export function drawTerrain(
  blockOffsetX: number,
  blockOffsetZ: number,
  terrainChunks: TerrainGeometry[]
) {
  const planes = terrainChunks.map((chunk, index) => {
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
      ; (planeGeom.attributes.position as THREE.BufferAttribute).setY(
        i,
        chunk.heightMap[i] + chunk.baseHeight
      )
    }

    planeGeom.translate(chunkOffsetX, 0, chunkOffsetZ)

    const edges = new THREE.EdgesGeometry(planeGeom, 10)

    return {
      plane: planeGeom,
      edges: edges
    }
  })

  const singleGeometry = mergeBufferGeometries(planes.map(({ plane }) => plane))

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      gradientMap: { value: gradientMap },
      darkeningFactor: { value: 1 }, // Keep the original colors for the ground
    },
    vertexShader: identityVertex,
    fragmentShader: heatFragment,
  })
  const mesh = new THREE.Mesh(singleGeometry, shaderMat)

  const edges = mergeBufferGeometries(planes.map(({ edges }) => edges))
  const edgeMat = shaderMat.clone()
  edgeMat.uniforms.darkeningFactor = { value: 0.9 } // Darken the wireframe mesh
  const line = new THREE.LineSegments(
    edges,
    edgeMat
  )

  scene.add(mesh)
  scene.add(line)
}
