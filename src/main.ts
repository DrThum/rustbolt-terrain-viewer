import { loadBlock } from './parsing'
import constants from './models/constants'
import { drawTerrain as buildBlockGeometryFromChunks } from './gui/viewport'

// GUI:
// - toggle between gradient/area
// - toggle mesh
// - 2 buttons for specific readable gradients and a third one to generate a random gradient
// import * as dat from 'dat.gui'

for (let blockRow = 29; blockRow < 35; blockRow++) {
  for (let blockCol = 29; blockCol < 35; blockCol++) {
    const blockOffsetX = constants.BLOCK_WIDTH * (blockRow - 32)
    const blockOffsetZ = constants.BLOCK_WIDTH * (blockCol - 32)

    const terrainChunks = await loadBlock('Azeroth', blockRow, blockCol)
    if (terrainChunks.length > 0) {
      buildBlockGeometryFromChunks(blockOffsetX, blockOffsetZ, terrainChunks)
    }
  }
}
