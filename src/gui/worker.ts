import * as THREE from 'three'
import constants from '../models/constants'
import { TerrainGeometry } from '../models/terrain_geometry'

/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope

export function prepareTerrain(
  blockOffsetX: number,
  blockOffsetZ: number,
  index: number,
  terrain: TerrainGeometry,
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
    ; (planeGeom.attributes.position as THREE.BufferAttribute).setY(
      i,
      terrain.heightMap[i] + terrain.baseHeight
    )
  }

  const mesh = new THREE.Mesh(planeGeom)

  const edges = new THREE.EdgesGeometry(planeGeom)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xaaaaaa })
  )

  mesh.position.x += chunkOffsetX
  mesh.position.z += chunkOffsetZ

  line.position.x += chunkOffsetX
  line.position.z += chunkOffsetZ

  return planeGeom
}
