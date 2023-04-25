import { loadBlock } from './parsing'
import constants from './models/constants'
import { drawTerrain } from './gui/viewport'

// GUI:
// - toggle between gradient/area
// - toggle mesh
// - 2 buttons for specific readable gradients and a third one to generate a random gradient
// import * as dat from 'dat.gui'

for (let blockRow = 29; blockRow < 34; blockRow++) {
  for (let blockCol = 29; blockCol < 34; blockCol++) {
    const blockOffsetX = constants.BLOCK_WIDTH * (blockRow - 32)
    const blockOffsetZ = constants.BLOCK_WIDTH * (blockCol - 32)

    const terrains = await loadBlock('Azeroth', blockRow, blockCol)

    terrains.forEach((terrain, idx) => {
      drawTerrain(blockOffsetX, blockOffsetZ, idx, terrain)
    })
  }
}
