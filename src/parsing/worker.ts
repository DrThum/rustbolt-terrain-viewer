import { TerrainGeometry } from "../models/terrain_geometry"

/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope

export async function loadBlock(
  mapName: string,
  row: number,
  col: number
): Promise<TerrainGeometry[]> {
  const response = await fetch(`/${mapName}_${row}_${col}.terrain`)

  if (response.status !== 200) {
    return Promise.resolve([])
  }

  const content = await response.blob()
  const reader = new FileReader()

  let resolvePromise: (_: TerrainGeometry[]) => void
  const promise: Promise<TerrainGeometry[]> = new Promise(
    (resolve) => (resolvePromise = resolve)
  )

  // TODO: load in a web worker
  reader.addEventListener('loadend', () => {
    const buffer = reader.result
    if (buffer instanceof ArrayBuffer) {
      const textDecoder = new TextDecoder('utf-8')
      const debugName =
        textDecoder.decode(buffer.slice(8, -1)).split('\0').shift() ?? ''

      const terrains: TerrainGeometry[] = []
      let currentOffset = 4 + 4 + debugName.length + 1
      for (
        let currentChunkNumber = 0;
        currentChunkNumber < 256;
        currentChunkNumber++
      ) {
        const dataView = new DataView(buffer.slice(currentOffset))
        const baseHeight = dataView.getFloat32(12, true)
        const heightMapView = new Float32Array(
          buffer.slice(currentOffset + 20, currentOffset + 20 + 145 * 4)
        )

        const hasLiquid = dataView.getUint8(20 + 145 * 4)
        const liquidSize = hasLiquid ? 1 + 1 + 9 * 9 * 4 + 8 * 8 : 0

        const heightMap = Array.from(heightMapView)

        terrains.push({
          baseHeight,
          heightMap: interpolateHeightMap(heightMap),
        })

        currentOffset += 4 + 4 + 4 + 4 + 4 + 145 * 4 + 1 + liquidSize
      }

      resolvePromise(terrains)
    } else {
      resolvePromise([])
    }
  })

  reader.readAsArrayBuffer(content)

  return promise
}

/**
 * Interpolate a WoW height map to make it suitable to use in a three.js PlaneGeometry
 *
 * Reminder of the structure of said height map:
 *
 * 0    1    2    3    4    5    6    7    8
 *   9    10   11   12   13   14   15   16
 * 17   18   19   20   21   22   23   24   25
 *   26   27   28   29   30   31   32   33
 * 34   35   36   37   38   39   40   41   42
 *   43   44   45   46   47   48   49   50
 * 51   52   53   54   55   56   57   58   59
 *   60   61   62   63   64   65   66   67
 * 68   69   70   71   72   73   74   75   76
 *   77   78   79   80   81   82   83   84
 * 85   86   87   88   89   90   91   92   93
 *   94   95   96   97   98   99   100  101
 * 102  103  104  105  106  107  108  109  110
 *   111  112  113  114  115  116  117  118
 * 119  120  121  122  123  124  125  126  127
 *   128  129  130  131  132  133  134  135
 * 136  137  138  139  140  141  142  143  144
 *
 * We need to add point in all of the empty spaces
 */
function interpolateHeightMap(heightMap: number[]): number[] {
  if (heightMap.length !== 145) {
    throw new Error('interpolateHeightMap: heightMap must have 145 values')
  }

  return heightMap
    .map((h, idx) => {
      if ((idx - 8) % 17 == 0) {
        // End of outer verticex row (8, 25, 42, ...): nothing to interpolate
        return [h]
      } else if (idx % 17 < 8) {
        // Outer vertices row (0-7, 17-24, ...): interpolate the mean between the current point and the next one
        const mean = (h + heightMap[idx + 1]) / 2
        return [h, mean]
      } else {
        // Inner vertices (9-16, 26-33, ...)
        if (idx % 17 == 9) {
          // First inner vertex of the row, interpolate before and after
          return [
            (heightMap[idx - 9] + heightMap[idx + 8]) / 2,
            h,
            (heightMap[idx - 8] + heightMap[idx + 9]) / 2,
          ]
        } else {
          // Other vertices, only interpolate after
          return [h, (heightMap[idx - 8] + heightMap[idx + 9]) / 2]
        }
      }
    })
    .flat()
}
