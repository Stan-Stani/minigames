import { GameObjects, Scene } from 'phaser'
import { stickyMessage, toastMessage } from '../debugging/tools'
const WIDTH = 256
const HEIGHT = 240
const GRAVITY = 128

interface IPlayer extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
  brakingInfo: {
    isBraking: boolean
    // direction body was moving when braking started
    directionBeforeBraking?: 'right' | 'left'
  }
  keyInfo: {
    right: boolean
    left: boolean
  }
}

export class BobberScene extends Scene {
  constructor() {
    super('BobberScene')
  }

  #textbox?: GameObjects.Text
  #playerOne?: IPlayer
  // @ts-ignore
  #generatedPlatforms: (Phaser.GameObjects.Image & {
    body: Phaser.Physics.Arcade.StaticBody
  })[] = []
  #platforms?: Phaser.Tilemaps.TilemapLayer
  #water?: Phaser.Tilemaps.TilemapLayer
  #spawnPlayer?: GameObjects.GameObject[]

  isRunning = false
  isOnGround = false

  /** Attempts to set the acceleration of the player in the given direction */
  setHorizontalAcceleration(direction: 'left' | 'right') {
    if (!this.#playerOne) return
    let baseAcceleration: number
    /** Returns true if player is accelerating in direction of
     * current velocity
     */
    let conditionalResultToUse: boolean
    let directionBeforeBraking: 'left' | 'right'
    if (direction === 'left') {
      baseAcceleration = -30
      conditionalResultToUse = (this.#playerOne?.body.velocity?.x ?? 0) <= 0
      directionBeforeBraking = 'right'
      // this.#playerOne?.setFlipX(true)
    } else if (direction === 'right') {
      baseAcceleration = 30
      conditionalResultToUse = (this.#playerOne?.body.velocity?.x ?? 0) >= 0
      directionBeforeBraking = 'left'
      // this.#playerOne?.setFlipX(false)
    } else {
      return
    }
    if (conditionalResultToUse && this.isOnGround) {
      this.#playerOne?.setAccelerationX(baseAcceleration)
    } else if (this.isOnGround) {
      // else we are trying to slow down while sliding in the other direction

      this.#playerOne.brakingInfo = {
        isBraking: true,
        directionBeforeBraking: directionBeforeBraking,
      }
      this.#playerOne?.setAccelerationX(2 * baseAcceleration)
    } else if (!this.isOnGround) {
      this.#playerOne.setAccelerationX(baseAcceleration / 2)
    }
  }

  preload() {
    this.load.image('player', './bobber/player.png')
    this.load.image('enemy', './enemy.png')
    this.load.image('tiles', './bobber/tiles.png')
    this.load.tilemapTiledJSON('tilemapLevel1', './bobber/level1.json')
  }

  create() {
    this.physics.world.setBounds(0, 0, WIDTH * 11, HEIGHT)
    this.cameras.main.setBounds(0, 0, 1024 * 4, HEIGHT)
   

    const map = this.make.tilemap({ key: 'tilemapLevel1' })
    const tileset = map.addTilesetImage('tiles', 'tiles')
    if (tileset) {
      this.#spawnPlayer = map.createFromObjects('Spawn', {
        name: 'playerSpawn',
      })
      this.#platforms = map.createLayer('platforms', tileset)!
      this.#platforms!.setCollisionByExclusion([-1], true)
      this.#water = map.createLayer('water', tileset)!
      this.#water!.setCollisionByExclusion([-1], true)
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
      'player'
    )
    this.#playerOne?.body.setSize(undefined, this.#playerOne.body.height * (2/3), false)

    this.#playerOne.brakingInfo = {
      isBraking: false,
      directionBeforeBraking: undefined,
    }
    this.#playerOne.keyInfo = { left: false, right: false }

    //   this.#playerOne.setCollideWorldBounds(true, 0.1, 0.1, true)

    // this.#playerOne.setBounce(0.1, 0.1)

    this.#playerOne.setDamping(true)
    this.cameras.main.startFollow(this.#playerOne, true)
    // this.cameras.main.setDeadzone(400, 200);

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
        //   pixel.body.setCollideWorldBounds(true)
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
            if (!this.#playerOne) return
            this.#playerOne.keyInfo.right = true
            this.setHorizontalAcceleration('right')
            this.isRunning = true
          })
          .on('up', () => {
            if (!this.#playerOne) return

            this.#playerOne.keyInfo.right = false
            // This conditional is so we don't set accel to 0 when releasing
            // the right key if both the left and right key are pressed, and
            // the object is currently accelerating left
            if ((this.#playerOne?.body.acceleration?.x ?? 0) > 0) {
              this.#playerOne?.setAccelerationX(0)
              this.#playerOne.brakingInfo = {
                isBraking: false,
                directionBeforeBraking: undefined,
              }
            }
            this.isRunning = false
          })

        left
          .on('down', () => {
            if (!this.#playerOne) return
            this.#playerOne.keyInfo.left = true
            this.setHorizontalAcceleration('left')
            this.isRunning = true

            stickyMessage({ _id: 'left' }, 'left: down')
          })
          .on('up', () => {
            if (!this.#playerOne) return
            this.#playerOne.keyInfo.left = false
            // See right key up event explanation
            if ((this.#playerOne?.body.acceleration?.x ?? 0) < 0) {
              this.#playerOne?.setAccelerationX(0)
              this.#playerOne.brakingInfo = {
                isBraking: false,
                directionBeforeBraking: undefined,
              }
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
        // @todo Logic for reinstating movement if a left or right key is held down
        if (this.#playerOne?.keyInfo.right) {
          this.setHorizontalAcceleration('right')
        } else if (this.#playerOne?.keyInfo.left) {
          this.setHorizontalAcceleration('left')
        }

        // down && onHitBottom(playerBody.gameObject)
      })
    }

    if (this.#water) {
      stickyMessage('wut')
      const collider = this.physics.add.collider(
        this.#playerOne,
        this.#water,
        () => {
          toastMessage('yoojlksdajf')
          this.#playerOne?.setGravityY(-GRAVITY)
        }
      )
      collider.overlapOnly = true
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
    stickyMessage('brakingInfo:', this.#playerOne?.brakingInfo)
    if (!this.#playerOne) return

    // Don't waste time calculating super small velocity endlessly for drag
    if (
      Math.abs(this.#playerOne?.body?.velocity.x ?? 0) < 0.1 &&
      this.#playerOne?.body?.acceleration.x === 0
    ) {
      this.#playerOne.body.velocity.x = 0
    }

    // Transition from increased abs value of decelleration of braking (60) to running's acceleration (30)
    if (this.#playerOne.brakingInfo.isBraking) {
      if (
        this.#playerOne.brakingInfo.directionBeforeBraking === 'right' &&
        this.#playerOne.body.velocity.x < 0
      ) {
        this.#playerOne.body.setAccelerationX(-30)
        this.#playerOne.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
      if (
        this.#playerOne.brakingInfo.directionBeforeBraking === 'left' &&
        this.#playerOne.body.velocity.x > 0
      ) {
        this.#playerOne.body.setAccelerationX(30)
        this.#playerOne.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
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
        if (this.#playerOne.keyInfo.right) {
          this.setHorizontalAcceleration('right')
        } else if (this.#playerOne.keyInfo.left) {
          this.setHorizontalAcceleration('left')
        }
      }
    }
    // clearStickyMessage()
  }
}
