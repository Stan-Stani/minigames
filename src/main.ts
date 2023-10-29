import './style.css'
import { Scene, Game, WEBGL, GameObjects, Physics } from 'phaser'
const WIDTH = 256
const HEIGHT = 240

const canvas = document.getElementById('game') as HTMLCanvasElement

class GameScene extends Scene {
  #textbox: GameObjects.Text | undefined
  #thing: Physics.Arcade.Sprite | undefined
  constructor() {
    super('scene-game')
  }

  preload() {
    this.load.image('kiwi', '/kiwi.png')
    this.load.svg('pause', 'https://assets.codepen.io/4261124/pause.svg')
  }

  create() {
    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT)

    this.#textbox = this.add.text(
      WIDTH / 2,
      HEIGHT / 2,
      'Welcome to Phaser x Vite!',
      {
        color: '#FFF',
        fontFamily: 'monospace',
        fontSize: '26px',
      }
    )

    this.#thing = this.physics.add.sprite(10, 10, 'kiwi')
    this.#thing.setCollideWorldBounds()

    this.#textbox.setOrigin(0.5, 0.5)
  }

  update(time: number, delta: number) {
    if (!this.#textbox) {
      return
    }

    this.#textbox.rotation += 0.0005 * delta
  }
}

const config = {
  type: WEBGL,
  width: WIDTH,
  height: HEIGHT,
  canvas,
  physics: {
    default: 'arcade',
    arcade: {
      // pixels per second
      gravity: { y: 25 },
      // debug: true
    },
  },
  scene: [GameScene],
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Game(config)
