import * as THREE from 'three'

export function setup() {
  let gradientMap: THREE.CanvasTexture

  const gradientCanvas = document.getElementById('heightgradient') as HTMLCanvasElement
  if (gradientCanvas !== null) {
    gradientMap = new THREE.CanvasTexture(gradientCanvas)

    const context = gradientCanvas.getContext('2d')

    if (context !== null) {
      gradientCanvas.addEventListener('click', () => {
        createGradMap(context, gradientMap)
      }, false)

      createGradMap(context, gradientMap)
    }

    return gradientMap
  } else {
    throw new Error('Canvas \'heightgradient\' not found')
  }
}

function createGradMap(context: CanvasRenderingContext2D, gradientMap: THREE.CanvasTexture) {
  const grd = context.createLinearGradient(0, 255, 0, 0)
  const colorAmount = 3 + THREE.MathUtils.randInt(0, 3)
  const colorStep = 1. / colorAmount

  for (let i = 0; i <= colorAmount; i++) {
    let r = THREE.MathUtils.randInt(0, 255)
    let g = THREE.MathUtils.randInt(0, 255)
    let b = THREE.MathUtils.randInt(0, 255)

    grd.addColorStop(colorStep * i, 'rgb(' + r + ',' + g + ',' + b + ')')
  }

  context.fillStyle = grd
  context.fillRect(0, 0, 64, 256)
  gradientMap.needsUpdate = true
}
