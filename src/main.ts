import './style.css'
import { Scene, Game, WEBGL, GameObjects, Physics } from 'phaser'
const WIDTH = 256
const HEIGHT = 240
const GRAVITY = 128

const canvas = document.getElementById('game') as HTMLCanvasElement

class GameScene extends Scene {
  #textbox?: GameObjects.Text
  #playerOne?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  // @ts-ignore
  #generatedPlatforms: (Phaser.GameObjects.Image & {
    body: Phaser.Physics.Arcade.StaticBody
  })[] = []
  #platforms?: Phaser.Tilemaps.TilemapLayer
  #spawnPlayer?: GameObjects.GameObject[]
  constructor() {
    super('scene-game')
  }
  isRunning = false
  isOnGround = false

  preload() {
    this.load.image('kiwi', './kiwi.png')
    this.load.image('enemy', './enemy.png')
    this.load.image('tiles', './platyKiwi/platyKiwi.png')
    this.load.tilemapTiledJSON('tilemapLevel1', './platyKiwi/level1.json')
  }

  create() {
    this.physics.world.setBounds(0, 0, WIDTH * 11, HEIGHT)
    this.cameras.main.setBounds(0, 0, 1024 * 4, HEIGHT)

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

    const map = this.make.tilemap({ key: 'tilemapLevel1' })
    const tileset = map.addTilesetImage('platyKiwi', 'tiles')
    if (tileset) {
      this.#spawnPlayer = map.createFromObjects('Spawn', {
        name: 'playerSpawn',
      })
      this.#platforms = map.createLayer('platforms', tileset)!
      this.#platforms!.setCollisionByExclusion([-1], true)
      //@ts-ignore
      const killObjects = map.createLayer('kill', tileset)
    }

    this.textures.generate('ground', {
      data: ['1'],
      pixelWidth: WIDTH,
      pixelHeight: 10,
    })

    // this.#generatedPlatforms = [
    //   this.physics.add
    //     .staticImage(0, HEIGHT, 'ground')
    //     .setOrigin(0, 1)
    //     .refreshBody(),

    //   this.physics.add
    //     .staticImage(50, HEIGHT - 30, 'ground')
    //     .setOrigin(0, 1)
    //     .refreshBody(),
    // ]

    console.log(this.#spawnPlayer)
    this.#playerOne = this.physics.add.sprite(
      this.#spawnPlayer[0].x,
      this.#spawnPlayer[0].y,
      'kiwi'
    )
    this.#playerOne.setCollideWorldBounds(true, 0.1, 0.1, true)

    // this.#playerOne.setBounce(0.1, 0.1)

    this.#playerOne.setDamping(true)
    this.cameras.main.startFollow(this.#playerOne, true)
    // this.cameras.main.setDeadzone(400, 200);

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
        pixel.setGravityY(-GRAVITY + 60)

        // Set properties on the physics body, if desired
        pixel.body.setCollideWorldBounds(true)
        pixel.body.setBounce(0.5)
        pixel.body.setVelocity(
          Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(-20, 20)
        )

        this.physics.add.collider(pixel, this.#platforms!)

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
          if (this.#playerOne?.body?.blocked.down) {
            this.#playerOne?.setVelocityY(-100)
          }
        })

        right
          .on('down', () => {
            this.#playerOne?.setAccelerationX(30)
            this.isRunning = true
          })
          .on('up', () => {
            // This conditional is so we don't set accel to 0 when releasing
            // the right key if both the left and right key are pressed, and
            // the object is currently accelerating left
            if ((this.#playerOne?.body.acceleration?.x ?? 0) > 0) {
              this.#playerOne?.setAccelerationX(0)
            }
            this.isRunning = false
          })

        left
          .on('down', () => {
            this.#playerOne?.setAccelerationX(-30)
            this.isRunning = true

            stickyMessage({ _id: 'left' }, 'left: down')
          })
          .on('up', () => {
            // See right key up event explanation
            if ((this.#playerOne?.body.acceleration?.x ?? 0) < 0) {
              this.#playerOne?.setAccelerationX(0)
            }
            this.isRunning = false

            stickyMessage({ _id: 'left' }, 'left: up')
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
      this.physics.add.collider(this.#playerOne, this.#platforms, () => {
        if (!this.isOnGround && this.#playerOne?.body?.blocked.down) {
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
          this.#playerOne?.setDrag(0.2, 0)
        }

        // The sprite hit the bottom side of the world bounds
        this.isOnGround = true

        // down && onHitBottom(playerBody.gameObject)
      })
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
    stickyMessage('playerOne Velocity:', this.#playerOne?.body?.velocity)
    stickyMessage(
      'playerOne Acceleration:',
      this.#playerOne?.body?.acceleration
    )

    // Don't waste time calculating super small velocity endlessly for drag
    if ((Math.abs(this.#playerOne?.body?.velocity.x ?? 0) < .1) && (this.#playerOne?.body?.acceleration.x === 0)) {
      this.#playerOne.body.velocity.x = 0
    }

    if (!this.#textbox) {
      return
    }

    // @ts-ignore
    // stickyMessage(this.#playerOne?.body?.drag)

    this.#textbox.rotation += 0.0005 * delta
    // stickyMessage(this.#playerOne?.body?.velocity)

    const friction = 0.35 // friction coefficient
    const deltaInSeconds = delta / 1000 // Convert delta to seconds

    // Apply friction factor to the player's velocity and make it frame rate independent

    if (this.#playerOne?.body) {
      // if (!this.isRunning && this.#playerOne?.body?.velocity.x) {
      //   this.#playerOne.body.velocity.x *= Math.pow(friction, deltaInSeconds)

      //   // Stop the sprite if the velocity is very low
      //   if (Math.abs(this.#playerOne.body.velocity.x) < 0.1) {
      //     this.#playerOne.body.velocity.x = 0
      //   }
      // }

      if (!this.#playerOne.body.blocked.down) {
        this.#playerOne?.setDrag(0.75, 0)
        this.isOnGround = false
      }
    }
    // clearStickyMessage()
  }
}

function stickyMessage(...messages: any) {
  // console.log(message)
  const prettyMessages: string[] = []
  let identifier

  identifier = getStackIdentifier()
  for (const message of messages) {
    if (message.hasOwnProperty('_id')) {
      identifier = message._id
      continue
    }

    prettyMessages.push(
      typeof message === 'string' || typeof message === 'number'
        ? String(message)
        : JSON.stringify(message)
    )
  }

  if (!stackToDivMap[identifier]) {
    console.log('s')
    // Create a new div for this identifier
    let newDiv = document.createElement('div')
    newDiv.textContent = prettyMessages.join(' ')
    const logDiv = document.getElementById('log')
    const messageDiv = logDiv!.appendChild(newDiv)
    messageDiv.classList.add('log-message', 'fade-in')
    stackToDivMap[identifier] = newDiv
  } else {
    // Update the existing div
    stackToDivMap[identifier].textContent = prettyMessages.join(' ')
  }
}

function clearStickyMessage() {
  const stickyMessage = document.getElementById('sticky-message')
  if (stickyMessage) {
    stickyMessage.innerHTML = ''
  }
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

interface IDictionary {
  [index: string]: HTMLElement
}
let stackToDivMap: IDictionary = {}

function getStackIdentifier() {
  let stack = new Error().stack
  if (stack) {
    let stackLines = stack.split('\n')
    // Use a combination of function name and line number as the identifier
    // Adjust the index based on where the relevant information is in your stack trace
    return stackLines[2] + stackLines[3]
  }
  return ''
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
      gravity: { y: GRAVITY },
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
