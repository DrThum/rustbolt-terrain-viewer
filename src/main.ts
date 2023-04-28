import { loadBlock } from './parsing'
import constants from './models/constants'
import { buildBlockGeometryFromChunks } from './gui/viewport'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

import fontFile from './fonts/helvetiker_regular.typeface.json'

// GUI:
// - toggle between gradient/area
// - toggle mesh
// - 2 buttons for specific readable gradients and a third one to generate a random gradient
// import * as dat from 'dat.gui'

const loader = new FontLoader()
const font = loader.parse(fontFile)

for (let blockRow = 29; blockRow < 35; blockRow++) {
  for (let blockCol = 29; blockCol < 35; blockCol++) {
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
  }
}
