import { Scene } from 'phaser'
import { Player } from './Player'

const BAR_START_X = 5
const BAR_WIDTH = 190
export class RaceProgressBar {
  #scene: Scene
  #startX: number
  #endX: number
  readonly playerToIndicatorMap = new Map<
    Player,
    Phaser.GameObjects.RenderTexture
  >()

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
    graphicsLine.setDepth(-4)
  }

  tryInitializePlayerIndicator(player: Player) {
    if (!this.playerToIndicatorMap.has(player)) {
      // We turn the graphic into a texture because at these low resolutions for some reason
      // the rendering of the circle graphic gets distorted.
      const circleTexture = this.#scene.add.renderTexture(0, 0, 9, 9)
      const tempGraphics = this.#scene.add.graphics()
      tempGraphics.fillStyle(0xffffff, 1.0)
      tempGraphics.fillCircle(4, 4, 4)

      tempGraphics.lineStyle(1, 0x000000, 1)
      tempGraphics.strokeCircle(4, 4, 4)

      circleTexture.draw(tempGraphics)
      tempGraphics.destroy()
      circleTexture.setPosition(50, 10)
      circleTexture.scrollFactorX = 0
      circleTexture.setTint(0xff0000)

      this.playerToIndicatorMap.set(player, circleTexture)
      return true
    }

    return false
  }

  updatePosition(player: Player) {
    this.tryInitializePlayerIndicator(player)
    const playerPosClampedToCourse = Math.min(
      Math.max(player.x, this.#startX),
      this.#endX
    )
    const offset =
      Math.abs(playerPosClampedToCourse / (this.#endX - this.#startX)) *
      BAR_WIDTH
    this.playerToIndicatorMap.get(player)?.setX(BAR_START_X + offset)
    console.log(player.myTint)
    player.myTint &&
      this.playerToIndicatorMap.get(player)?.setTint(player.myTint)
  }
}
