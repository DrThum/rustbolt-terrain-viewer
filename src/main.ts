import constants from './models/constants'
import { drawTerrain, drawTerrainNew } from './gui/viewport'

import { workerInstance } from './parsing/utils'
import { workerInstance as workerInstanceGUI } from './gui/utils'
import { setup } from './gui/gradient-map'

// GUI:
// - toggle between gradient/area
// - toggle mesh
// - 2 buttons for specific readable gradients and a third one to generate a random gradient
// import * as dat from 'dat.gui'

for (let blockRow = 29; blockRow < 35; blockRow++) {
  for (let blockCol = 29; blockCol < 35; blockCol++) {
    const blockOffsetX = constants.BLOCK_WIDTH * (blockRow - 32)
    const blockOffsetZ = constants.BLOCK_WIDTH * (blockCol - 32)
    const terrains = await workerInstance.loadBlock('Azeroth', blockRow, blockCol)

    terrains.forEach((terrain, idx) => {
      workerInstanceGUI.prepareTerrain(blockOffsetX, blockOffsetZ, idx, terrain).then((planeGeom) => {
        drawTerrainNew(planeGeom)

      })
    })
  }
}
