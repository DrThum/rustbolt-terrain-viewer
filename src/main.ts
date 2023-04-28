import { loadBlock } from './parsing'
import constants from './models/constants'
import { buildBlockGeometryFromChunks } from './gui/viewport'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

import fontFile from './fonts/helvetiker_regular.typeface.json'
import { overlay } from 'three/examples/jsm/nodes/Nodes.js'

// GUI:
// - toggle between gradient/area
// - toggle mesh
// - 2 buttons for specific readable gradients and a third one to generate a random gradient
// import * as dat from 'dat.gui'

const loader = new FontLoader()
const font = loader.parse(fontFile)

const counterElement = document.getElementById('current-count')
let counter = 0

if (counterElement !== null) {
  for (let blockRow = 31; blockRow < 33; blockRow++) {
    for (let blockCol = 31; blockCol < 33; blockCol++) {
      const blockOffsetX = constants.BLOCK_WIDTH * (blockRow - 32)
      const blockOffsetZ = constants.BLOCK_WIDTH * (blockCol - 32)

      const terrainChunks = await loadBlock('Azeroth', blockRow, blockCol)
      if (terrainChunks.length > 0) {
        buildBlockGeometryFromChunks(
          blockOffsetX,
          blockOffsetZ,
          terrainChunks,
          font
        )
      }

      counterElement.innerText = (++counter).toString()
    }
  }
}

const overlayElement = document.getElementById('loading-overlay')
if (overlayElement !== null) {
  overlayElement.style.display = 'none'
}
