import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import constants from '../models/constants'
import { setup } from './gradient-map'
import { TerrainGeometry } from '../models/terrain_geometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

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
    // vec3 col = texture2D(gradientMap, vec2(0, v)).rgb * vec3(darkeningFactor);
    vec3 col = unpackColor(hAreaId * (16777215. / 4130.));
    gl_FragColor = vec4(col, 1.);
  }
`

const gradientMap = setup()

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

    const edges = new THREE.EdgesGeometry(planeGeom, 10)

    return {
      plane: planeGeom,
      edges: edges,
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
  scene.add(textMesh)

  const singleGeometry = mergeGeometries(planes.map(({ plane }) => plane))

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      gradientMap: { value: gradientMap },
      darkeningFactor: { value: 1 }, // Keep the original colors for the ground
    },
    vertexShader: identityVertex,
    fragmentShader: heatFragment,
  })
  const mesh = new THREE.Mesh(singleGeometry, shaderMat)

  const edges = mergeGeometries(planes.map(({ edges }) => edges))
  const edgeMat = shaderMat.clone()
  edgeMat.uniforms.darkeningFactor = { value: 0.9 } // Darken the wireframe mesh
  const line = new THREE.LineSegments(edges, edgeMat)

  scene.add(mesh)
  scene.add(line)
}
