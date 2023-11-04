import './style.css'
import { Scene, Game, WEBGL, GameObjects, Physics } from 'phaser'
const WIDTH = 256
const HEIGHT = 240

const canvas = document.getElementById('game') as HTMLCanvasElement

class GameScene extends Scene {
  #textbox: GameObjects.Text
  #playerOne?: Physics.Arcade.Sprite
  constructor() {
    super('scene-game')
  }
  isRunning = false

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

    this.#playerOne = this.physics.add.sprite(10, 10, 'kiwi')
    this.#playerOne.setCollideWorldBounds()

    this.#textbox.setOrigin(0.5, 0.5)

    const handleInputs = () => {
      try {
        if (!this.input.keyboard) {
          throw new Error('Keyboard property of input is falsy')
        }

        var spaceBar = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SPACE
        )
        var right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        var left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)

        spaceBar.on('down', () => {
          toastMessage(this.#playerOne)
          this.#playerOne?.setVelocityY(-30)
        })

        right
          .on('down', () => {
            this.#playerOne?.setAccelerationX(30)
            this.isRunning = true
          })
          .on('up', () => {
            this.#playerOne?.setAccelerationX(0)
            this.isRunning = false
          })

        left
          .on('down', () => {
            this.#playerOne?.setAccelerationX(-30)
            this.isRunning = true
          })
          .on('up', () => {
            this.#playerOne?.setAccelerationX(0)
            this.isRunning = false
          })
      } catch (e: any) {
        toastMessage(e.message)
      }
    }

    handleInputs()
  }

  update(time: number, delta: number) {
    if (!this.#textbox) {
      return
    }

    this.#textbox.rotation += 0.0005 * delta
    stickyMessage(this.#playerOne?.body?.velocity)

    const friction = 0.35 // friction coefficient
    const deltaInSeconds = delta / 1000 // Convert delta to seconds

    // Apply friction factor to the player's velocity and make it frame rate independent

    if (!this.isRunning && this.#playerOne?.body?.velocity.x) {
      this.#playerOne.body.velocity.x *= Math.pow(friction, deltaInSeconds)

      // Stop the sprite if the velocity is very low
      if (Math.abs(this.#playerOne.body.velocity.x) < 0.1) {
        this.#playerOne.body.velocity.x = 0
      }
    }
  }
}

function stickyMessage(message: any) {
  console.log(message)
  const prettyMessage =
    typeof message === 'string' || typeof message === 'number'
      ? String(message)
      : JSON.stringify(message)

  if (!document.getElementById('sticky-message')) {
    const logDiv = document.getElementById('log')
    const messageDiv = document.createElement('div')
    messageDiv.id = 'sticky-message'
    messageDiv.classList.add('log-message', 'fade-in')
    logDiv?.appendChild(messageDiv)
  }

  const stickyMessage = document.getElementById('sticky-message')!
  stickyMessage.textContent = prettyMessage
}

function toastMessage(message: any) {
  console.log(message)
  const prettyMessage =
    typeof message === 'string' || typeof message === 'number'
      ? String(message)
      : JSON.stringify(message)
  const logDiv = document.getElementById('log')
  const messageDiv = document.createElement('div')
  messageDiv.classList.add('log-message', 'fade-in')
  logDiv?.appendChild(messageDiv)
  messageDiv?.append(prettyMessage)
  setTimeout(() => {
    messageDiv.classList.add('fade-out')
    setTimeout(() => messageDiv.remove(), 2000)
  }, 7000)
}

const config: Phaser.Types.Core.GameConfig = {
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
    parent: 'game-wrapper',
    // mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Game(config)
