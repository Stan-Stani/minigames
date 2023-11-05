import './style.css'
import { Scene, Game, WEBGL, GameObjects, Physics } from 'phaser'
const WIDTH = 256
const HEIGHT = 240

const canvas = document.getElementById('game') as HTMLCanvasElement

class GameScene extends Scene {
  #textbox?: GameObjects.Text
  #playerOne?: Physics.Arcade.Sprite
  #platforms: (Phaser.GameObjects.Image & {
    body: Phaser.Physics.Arcade.StaticBody
  })[] = []
  constructor() {
    super('scene-game')
  }
  isRunning = false
  isOnGround = false

  preload() {
    this.load.image('kiwi', './kiwi.png')
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

    this.textures.generate('ground', {
      data: ['1'],
      pixelWidth: WIDTH,
      pixelHeight: 10,
    })

    this.#platforms = [
      this.physics.add
        .staticImage(0, HEIGHT, 'ground')
        .setOrigin(0, 1)
        .refreshBody(),

        this.physics.add
        .staticImage(50, HEIGHT - 30, 'ground')
        .setOrigin(0, 1)
        .refreshBody()
    ]

    this.#playerOne = this.physics.add.sprite(10, 10, 'kiwi')
    this.#playerOne.setCollideWorldBounds(true, 0.1, 0.1, true)

    this.#playerOne.setBounce(0.1, 0.1)

    this.#textbox.setOrigin(0.5, 0.5)

    const dustCollision = (
      [minX, maxX]: [number, number],
      [minY, maxY]: [number, number]
    ) => {
      for (let i = 0; i < 10; i++) {
        // Create a physics sprite using the 'pixel' texture at random positions
        let x = Phaser.Math.Between(minX, maxX)
        let y = Phaser.Math.Between(minY, maxY)
        let pixel = this.physics.add.sprite(x, y, 'pixel')

        // Set properties on the physics body, if desired
        pixel.body.setCollideWorldBounds(true)
        pixel.body.setBounce(0.5)
        pixel.body.setVelocity(
          Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(-20, 20)
        )

        for (const element of this.#platforms) {
          this.physics.add.collider(pixel, element)
        }

        this.time.delayedCall(
          5000,
          () => {
            this.tweens.add({
              targets: pixel,
              alpha: { from: 1, to: 0 },
              duration: 500,
              onComplete: () => {
                pixel.destroy()
              },
            })
          },
          [],
          this
        )
      }
    }

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

    // Create a one-pixel texture called 'pixel'
    this.textures.generate('pixel', {
      data: ['1'],
      pixelWidth: 1,
      pixelHeight: 1,
    })

    // const onHitBottom = (gameObject: any) => {
    //   // This function will be called when the pixel hits the bottom side of world bounds or another object

    //   // Perform any additional logic here, such as playing a sound or changing the game state

    //   // Create a physics sprite using the 'pixel' texture
    //   for (let i = 0; i < 10; i++) {
    //     // Create a physics sprite using the 'pixel' texture at random positions
    //     let x = Phaser.Math.Between(0, WIDTH)
    //     let y = Phaser.Math.Between(0, HEIGHT)
    //     let pixel = this.physics.add.sprite(x, y, 'pixel')

    //     // Set properties on the physics body, if desired
    //     pixel.body.setCollideWorldBounds(true)
    //     pixel.body.setBounce(0.5)
    //     pixel.body.setVelocity(
    //       Phaser.Math.Between(-200, 200),
    //       Phaser.Math.Between(-200, 200)
    //     )
    //   }
    // }

    const playerBody = this.#playerOne.body as Phaser.Physics.Arcade.Body

    playerBody.onCollide = true
    if (this.#platforms) {
      for (const element of this.#platforms) {
        this.physics.add.collider(this.#playerOne, element, () => {
          if (!this.isOnGround && this.#playerOne?.body?.touching.down) {
            dustCollision(
              [
                this.#playerOne?.x! - this.#playerOne?.width! / 2,
                this.#playerOne?.x! + this.#playerOne?.width! / 2,
              ],
              [
                this.#playerOne?.y! + this.#playerOne?.height! / 2,
                this.#playerOne?.y! + this.#playerOne?.height! / 2,
              ]
            )
          }

          // The sprite hit the bottom side of the world bounds
          this.isOnGround = true
          stickyMessage('hey')
          // down && onHitBottom(playerBody.gameObject)
        })
      }
    }
    // Listen for the 'worldbounds' event

    // // You can also check for collisions with other objects
    // this.physics.add.collider(this.#playerOne, anotherGameObject, (pixel, other) => {
    //     if (pixel.body.touching.down) {
    //         // The sprite's bottom side touched another game object
    //         this.onHitBottom(pixel);
    //     }
    // });
    // }
  }

  update(_time: number, delta: number) {
    if (!this.#textbox) {
      return
    }

    this.#textbox.rotation += 0.0005 * delta
    // stickyMessage(this.#playerOne?.body?.velocity)

    const friction = 0.35 // friction coefficient
    const deltaInSeconds = delta / 1000 // Convert delta to seconds

    // Apply friction factor to the player's velocity and make it frame rate independent

    if (this.#playerOne?.body) {
      if (!this.isRunning && this.#playerOne?.body?.velocity.x) {
        this.#playerOne.body.velocity.x *= Math.pow(friction, deltaInSeconds)

        // Stop the sprite if the velocity is very low
        if (Math.abs(this.#playerOne.body.velocity.x) < 0.1) {
          this.#playerOne.body.velocity.x = 0
        }
      }

      if (!this.#playerOne.body.touching.down) {
        // If the character is in the air, they can trigger the dust particles again upon the next landing
        this.isOnGround = false
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
