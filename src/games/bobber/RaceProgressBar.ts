import { Scene } from 'phaser'

const BAR_START_X = 5
const BAR_WIDTH = 190
export class RaceProgressBar {
  #scene: Scene
  #circleTexture: Phaser.GameObjects.RenderTexture
  #startX: number
  #endX: number

  constructor(
    scene: Scene,
    { startX, endX }: { startX: number; endX: number }
  ) {
    this.#scene = scene
    this.#startX = startX
    this.#endX = endX

    const graphicsLine = this.#scene.add.graphics()
    graphicsLine.fillStyle(0xffffff, 1.0)
    graphicsLine.fillRect(BAR_START_X, 10, BAR_WIDTH, 3)
    graphicsLine.scrollFactorX = 0

    // We turn the graphic into a texture because at these low resolutions for some reason
    // the rendering of the circle graphic gets distorted.
    const circleTexture = this.#scene.add.renderTexture(0, 0, 9, 9)
    const tempGraphics = this.#scene.add.graphics()
    tempGraphics.fillStyle(0xff0000, 1.0)
    tempGraphics.fillCircle(4, 4, 4)
    circleTexture.draw(tempGraphics)
    tempGraphics.destroy()
    circleTexture.setPosition(50, 10) // Position next to the graphics circle
    this.#circleTexture = circleTexture
    this.#circleTexture.scrollFactorX = 0
    // graphics.setDepth(1000)
  }

  updatePosition(xPos: number) {
    const playerPosClampedToCourse = Math.min(
      Math.max(xPos, this.#startX),
      this.#endX
    )
    const offset =
      Math.abs(playerPosClampedToCourse / (this.#endX - this.#startX)) *
      BAR_WIDTH
    this.#circleTexture.setX(BAR_START_X + offset)
  }
}
