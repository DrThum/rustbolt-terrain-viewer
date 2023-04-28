import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import constants from '../models/constants'
import { setup } from './gradient-map'
import { TerrainGeometry } from '../models/terrain_geometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { GUI } from 'dat.gui'

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const raycaster = new THREE.Raycaster()
const pointerPos = new THREE.Vector2()

window.addEventListener('pointermove', (event) => {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  pointerPos.x = (event.clientX / window.innerWidth) * 2 - 1
  pointerPos.y = -(event.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('click', (_) => {
  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children)

  if (intersects.length > 0) {
    console.log(`terrain height: ${intersects[0].point.y}`)
  }
})

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

  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(pointerPos, camera)

  stats.begin()
  const delta = clock.getDelta()
  controls.update(delta)

  renderer.render(scene, camera)

  // console.log(renderer.info.render)
  stats.end()
}

animate()

const identityVertex = `
  attribute float areaId;

  varying float hValue;
  flat varying float hAreaId;

  void main()
  {
    hValue = position.y;
    hAreaId = areaId;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const heatFragment = `
  uniform sampler2D gradientMap;
  uniform float darkeningFactor;
  uniform int mode;

  varying float hValue;
  flat varying float hAreaId;

  vec3 unpackColor(float f)
  {
    vec3 color;
    color.r = floor(f / 65536.);
    color.g = floor((f - color.r * 65536.) / 256.0);
    color.b = floor(f - color.r * 65536. - color.g * 256.0);
    return color / 256.0;
  }

  void main() {
    float v = clamp(hValue / 250., 0., 1.);
    if (mode == 0) {
      vec3 col = texture2D(gradientMap, vec2(0, v)).rgb * vec3(darkeningFactor);
      gl_FragColor = vec4(col, 1.);
    } else if (mode == 1) {
      vec3 col = unpackColor(hAreaId * (16777215. / 4130.)); // 16777215 = 2^24-1 and 4130 = max area ID in TBC 2.4.3
      gl_FragColor = vec4(col, 1.);
    }
  }
`

const gradientMap = setup()

const shaderMat = new THREE.ShaderMaterial({
  uniforms: {
    gradientMap: { value: gradientMap },
    darkeningFactor: { value: 1 }, // Keep the original colors for the ground
    mode: { value: 0 },
  },
  vertexShader: identityVertex,
  fragmentShader: heatFragment,
})

const edgeMat = shaderMat.clone()
edgeMat.uniforms.darkeningFactor = { value: 0.9 } // Darken the wireframe mesh

const gui = new GUI()
const modeFolder = gui.addFolder('Mode')
modeFolder.open()
const settings = { mode: 0 } // heightMap || areaId
const settingsController = modeFolder.add(settings, 'mode', {
  heightMap: 0,
  areaId: 1,
})
settingsController.onChange((newValue) => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.isText) {
      child.visible = newValue == 1
    }
  })

  shaderMat.uniforms.mode.value = newValue
  shaderMat.needsUpdate = true

  edgeMat.uniforms.mode.value = newValue
  edgeMat.needsUpdate = true
})

export function buildBlockGeometryFromChunks(
  blockOffsetX: number,
  blockOffsetZ: number,
  terrainChunks: TerrainGeometry[],
  font: Font
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

    const count = planeGeom.attributes.position.count
    const areaIdArray = new Float32Array(count)
    areaIdArray.fill(chunk.areaId, 0, count)
    const areaIds = new THREE.BufferAttribute(areaIdArray, 1)
    let maxHeight = -999999
    for (let i = 0; i < planeGeom.attributes.position.count; i++) {
      const y = chunk.heightMap[i] + chunk.baseHeight

      ;(planeGeom.attributes.position as THREE.BufferAttribute).setY(i, y)

      maxHeight = Math.max(maxHeight, y)
    }

    planeGeom.translate(chunkOffsetX, 0, chunkOffsetZ)
    planeGeom.setAttribute('areaId', areaIds)

    const areaIdText = new TextGeometry(chunk.areaId.toString(), {
      font: font,
      size: 6,
      height: 0.5,
      curveSegments: 3,
    })
    areaIdText.rotateX(-Math.PI * 0.25)
    areaIdText.translate(chunkOffsetX, maxHeight + 20, chunkOffsetZ)

    return {
      plane: planeGeom,
      areaIdText,
    }
  })

  const textSingleGeometry = mergeGeometries(
    planes.map(({ areaIdText }) => areaIdText)
  )
  const textMesh = new THREE.Mesh(
    textSingleGeometry,
    new THREE.MeshBasicMaterial({ color: 'black' })
  )
  textMesh.userData.isText = true
  textMesh.visible = false
  scene.add(textMesh)

  const singleGeometry = mergeGeometries(planes.map(({ plane }) => plane))

  const mesh = new THREE.Mesh(singleGeometry, shaderMat)
  mesh.userData.isText = false

  const edges = new THREE.EdgesGeometry(singleGeometry, 10)
  const line = new THREE.LineSegments(edges, edgeMat)

  scene.add(mesh)
  scene.add(line)
}
