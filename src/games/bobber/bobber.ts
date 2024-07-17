import { GameObjects, Scene } from 'phaser'
import { BobberInputScene, InputScene } from './inputScene'
import {
  clearStickyMessage,
  stickyMessage,
  toastMessage,
} from '../../debugging/tools'
import { Player } from './Player'
const WIDTH = 256
const HEIGHT = 240
const GRAVITY = 128

interface spawnLocation extends Phaser.Types.Tilemaps.TiledObject {
  x: number
  y: number
}



export class BobberScene extends Scene {
  constructor() {
    super('BobberScene')
  }
  static teleportCheat: [boolean, number, number] = [false, 0, 0]
  static HAS_LOCAL_STORAGE = false

  inspectorScene: any
  #timerText?: GameObjects.Text
  playerOne?: Player
  // @ts-ignore
  #generatedPlatforms: (Phaser.GameObjects.Image & {
    body: Phaser.Physics.Arcade.StaticBody
  })[] = []
  #platforms?: Phaser.Tilemaps.TilemapLayer
  #water?: Phaser.Tilemaps.TilemapLayer
  #kill?: Phaser.Tilemaps.TilemapLayer | null
  initialSpawn?: spawnLocation
  isRunning = false
  isOnGround = false
  teleportDestination = BobberScene.teleportCheat?.slice(1) as [number, number]

  makeBuoyComposite(x: number, y: number) {
    if (!this.#platforms) {
      throw new Error('#Platforms is falsy')
    }
    if (!this.playerOne) {
      throw new Error('playerOne is falsy')
    }
    const buoy = this.physics.add.sprite(x, y, 'buoy')
    buoy.setImmovable(true)

    buoy.body.setAllowGravity(false)
    buoy.setDepth(-2)
    const buoy1RelativeOrigin = [0.5 * buoy.width, 0.85 * buoy.height]
    buoy.setDisplayOrigin(...buoy1RelativeOrigin)
    this.anims.createFromAseprite('buoy', undefined, buoy)

    const buoy1AbsoluteMiddleX = buoy.x
    const buoy1AbsoluteTopY = buoy.y - buoy1RelativeOrigin[1]
    const buoy1LightAbsoluteMiddleX = buoy1AbsoluteMiddleX - 2
    const buoy1LightAbsoluteMiddleY = buoy1AbsoluteTopY + 1
    const activationParticles = this.add.sprite(
      buoy1LightAbsoluteMiddleX,
      buoy1LightAbsoluteMiddleY,
      'buoyActivate'
    )
    activationParticles.setVisible(false)

    this.anims.createFromAseprite(
      'buoyActivate',
      undefined,
      activationParticles
    )

    this.physics.add.collider(buoy, this.#platforms)

    const overlap = this.physics.add.overlap(buoy, this.playerOne, () => {
      if (!this.playerOne) {
        return
      }
      buoy.play({ key: 'default', repeat: -1, startFrame: 1 })

      activationParticles.play({
        key: 'default',
        hideOnComplete: true,
        showOnStart: true,
      })

      this.playerOne.respawnDestination = [x, y]

      overlap.destroy()
    })
  }

  

  getTileAtBottomOfSprite(
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    tileLayer: Phaser.Tilemaps.TilemapLayer,
    tileIndex?: number
  ): Phaser.Tilemaps.Tile | null {
    let tile: Phaser.Tilemaps.Tile | null = tileLayer.getTileAtWorldXY(
      sprite.body.x + sprite.body.halfWidth,
      sprite.body.y + sprite.body.height
    )
    if (tile) {
      if (tileIndex && tileIndex === tile?.index) {
        return tile
      } else if (!tileIndex) {
        return tile
      }
    }
    return null
  }

  calculateVerticalOverlap(
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    tile: Phaser.Tilemaps.Tile
  ) {
    let spriteBounds = sprite.getBounds()
    let tileBounds = tile.getBounds()

    // Determine the overlapping rectangle
    let intersection = Phaser.Geom.Rectangle.Intersection(
      spriteBounds,
      tileBounds as Phaser.Geom.Rectangle
    )

    // Calculate the percentage of overlap
    let overlapHeight = intersection.height
    let spriteHeight = spriteBounds.height
    let overlapPercentage = (overlapHeight / spriteHeight) * 100

    return overlapPercentage
  }

  preload() {
    this.load.image('background1', './bobber/background1.png')
    this.load.image('player', './bobber/player.png')
    this.load.image('enemy', './enemy.png')
    this.load.aseprite({
      key: 'buoy',
      textureURL: './bobber/entities/buoy.png',
      atlasURL: './bobber/entities/buoy.json',
    })
    this.load.aseprite({
      key: 'buoyActivate',
      textureURL: './bobber/entities/buoyActivate.png',
      atlasURL: './bobber/entities/buoyActivate.json',
    })

    this.load.image('tiles', './bobber/tiles.png')
    this.load.tilemapTiledJSON('tilemapLevel1', './bobber/level1.json')
  }

  

  create() {
    this.scene.launch('BobberInputScene')
    this.#timerText = this.add.text(WIDTH * 0.8, HEIGHT * 0.05, '00', {
      fontSize: `10px`,
      color: '#FFF',
      fontFamily: 'gameboy',
    })

    const background = this.add.image(0, 0, 'background1')
    background.setOrigin(0, 0).setDepth(-4).setScrollFactor(0)

    this.physics.world.setBounds(0, 0, WIDTH * 11, HEIGHT)
    this.cameras.main.setBounds(0, 0, 1024 * 4, HEIGHT)

    const map = this.make.tilemap({ key: 'tilemapLevel1' })
    const tileset = map.addTilesetImage('tiles', 'tiles')

    const spawnLayer = map.getObjectLayer('Spawn')

    if (!spawnLayer) {
      return
    }
    const playerSpawn = spawnLayer.objects.find(
      (obj): obj is spawnLocation =>
        obj.name === 'playerSpawn' &&
        typeof obj.x === 'number' &&
        typeof obj.y === 'number'
    )
    const checkpoints = spawnLayer.objects.filter(
      (obj): obj is spawnLocation =>
        obj.type === 'checkpoint' &&
        typeof obj.x === 'number' &&
        typeof obj.y === 'number'
    )

    if (playerSpawn && tileset) {
      this.initialSpawn = playerSpawn
      this.playerOne = new Player(this)
      
     

      if (!this.initialSpawn) throw new Error()

      this.#water = map.createLayer('water', tileset)!
      this.#water!.setCollisionByExclusion([-1], true)
      this.#platforms = map.createLayer('platforms', tileset)!
      this.#platforms!.setCollisionByExclusion([-1], true)
      this.#kill = map.createLayer('kill', tileset)

      checkpoints.forEach((cp) => {
        this.makeBuoyComposite(cp.x, cp.y)
      })

      if (!this.#kill) {
        throw new Error(`kill is ${this.#kill} but cannot be falsy`)
      }

      this.#kill.setCollisionByExclusion([-1], true)

      this.physics.add.collider(this.playerOne, this.#kill, () => {
        if (!this.playerOne?.respawn) {
          return
        }
        this.playerOne?.respawn(
          this.playerOne?.respawnDestination || [
            this.initialSpawn?.x ?? 0,
            this.initialSpawn?.y ?? 0 - 50,
          ]
        )
        this.playerOne?.setVelocity(0, 0)
      })
    }
    if (!this.playerOne) throw new Error()
    if (!this.initialSpawn) throw new Error()
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
        this.physics.add.collider(pixel, this.#kill!)

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
        if (!this.playerOne) return

        this.input.keyboard.removeAllKeys(true, true)

        const spaceBar = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SPACE
        )
        const right = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.D
        )
        const left = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.A
        )
        const numPadOne = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE
        )
        const numPadTwo = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO
        )

        spaceBar
          .on('down', this.playerOne.diveButtonDown)
          .on('up', this.playerOne.diveButtonUp)
        
        right
          .on('down', this.playerOne.rightButtonDown)
          .on('up', this.playerOne.rightButtonUp)

        left
          .on('down', this.playerOne.leftButtonDown)
          .on('up', this.playerOne.leftButonUp)

        numPadOne.on('down', this.playerOne.setTeleportButtonDown)
        numPadTwo.on('down', this.playerOne.invokeTeleportButtonDown)

      } catch (e: any) {
        toastMessage(e.message)
      }
    }

    handleInputs()

    this.events.on('resume', () => handleInputs(), this)

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

    const playerBody = this.playerOne.body as Phaser.Physics.Arcade.Body

    playerBody.onCollide = true
    if (this.#platforms) {
      this.physics.add.collider(this.playerOne, this.#platforms, () => {
        if (!this.isOnGround && this.playerOne?.body?.blocked.down) {
          dustCollision(
            [
              this.playerOne?.x! - this.playerOne?.width! / 2,
              this.playerOne?.x! + this.playerOne?.width! / 2,
            ],
            [
              this.playerOne?.y! + this.playerOne?.height! / 2,
              this.playerOne?.y! + this.playerOne?.height! / 2,
            ]
          )
          this.playerOne?.setDrag(0.2, 0)
        }


        // The sprite hit the bottom side of the world bounds
        this.isOnGround = true
        // @todo Is the below even necessary?
        // @todo Logic for reinstating movement if a left or right key is held down
        if (this.playerOne?.keyInfo.right) {
          this.playerOne.setHorizontalAcceleration('right')
        } else if (this.playerOne?.keyInfo.left) {
          this.playerOne.setHorizontalAcceleration('left')
        }

        // down && onHitBottom(playerBody.gameObject)
      })
    }
  }

  update(time: number, _delta: number) {
    const fullSeconds = Math.floor(time / 1000)
    const fullMinutes = Math.floor(fullSeconds / 60)
    const remainderSeconds = fullSeconds % 60
    const timeString = `${fullMinutes}:${
      remainderSeconds < 10 ? '0' + remainderSeconds : remainderSeconds
    }`
    this.#timerText?.setText(timeString)
    this.#timerText?.setScrollFactor(0)
    console.log(this.cameras.main.getBounds().x)
    stickyMessage(
      'playerOne Net Gravity:',
      (this.playerOne?.body.gravity.y ?? 0) + GRAVITY
    )
    stickyMessage('playerOne Velocity:', this.playerOne?.body?.velocity)
    stickyMessage('playerOne Acceleration:', this.playerOne?.body?.acceleration)
    stickyMessage('brakingInfo:', this.playerOne?.brakingInfo)
    if (!this.playerOne || !this.initialSpawn) return

    const nullIfOutsideLevel = this.#water?.getTileAtWorldXY(
      this.playerOne.body.x + this.playerOne.body.width / 2,
      this.playerOne.body.y + this.playerOne.body.height / 2,
      true
    )

    if (nullIfOutsideLevel === null) {
      this.playerOne?.setPosition(this.initialSpawn.x, this.initialSpawn.y - 50)
      this.playerOne?.setVelocity(0, 0)
    }

    // Don't waste time calculating super small velocity endlessly for drag
    if (
      Math.abs(this.playerOne?.body?.velocity.x ?? 0) < 0.1 &&
      this.playerOne?.body?.acceleration.x === 0
    ) {
      this.playerOne.body.velocity.x = 0
    }

    // Transition from increased abs value of decelleration of braking (60) to running's acceleration (30)
    if (this.playerOne.brakingInfo.isBraking) {
      if (
        this.playerOne.brakingInfo.directionBeforeBraking === 'right' &&
        this.playerOne.body.velocity.x < 0
      ) {
        this.playerOne.body.setAccelerationX(-30)
        this.playerOne.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
      if (
        this.playerOne.brakingInfo.directionBeforeBraking === 'left' &&
        this.playerOne.body.velocity.x > 0
      ) {
        this.playerOne.body.setAccelerationX(30)
        this.playerOne.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
    }

    // @ts-ignore
    // stickyMessage(this.playerOne?.body?.drag)

    // stickyMessage(this.playerOne?.body?.velocity)

    // Apply friction factor to the player's velocity and make it frame rate independent

    if (this.playerOne?.body) {
      // if (!this.isRunning && this.playerOne?.body?.velocity.x) {
      //   this.playerOne.body.velocity.x *= Math.pow(friction, deltaInSeconds)

      //   // Stop the sprite if the velocity is very low
      //   if (Math.abs(this.playerOne.body.velocity.x) < 0.1) {
      //     this.playerOne.body.velocity.x = 0
      //   }
      // }

      const tile = this.#water?.getTileAtWorldXY(
        this.playerOne.body.x + this.playerOne.body.width / 2,
        this.playerOne.body.y + this.playerOne.body.height / 3
      )
      let wasImmersedPreviousFrame = this.playerOne.isImmersed
      if (tile?.index === 17 || tile?.index === 33) {
        this.playerOne.isImmersed = true
      } else {
        this.playerOne.isImmersed = false
      }
      if (this.playerOne.isImmersed !== wasImmersedPreviousFrame) {
        const magnitudeReduction = 1
        const playerVelocity = this.playerOne.body.velocity.y
        if (playerVelocity > 0) {
          this.playerOne.body.setVelocityY(playerVelocity - magnitudeReduction)
        } else if (playerVelocity < 0) {
          this.playerOne.body.setVelocityY(playerVelocity + magnitudeReduction)
        }
      }
      stickyMessage({ isImmersed: this.playerOne.isImmersed })

      if (!this.playerOne.isDoneBobbing) {
        if (this.playerOne.isImmersed) {
          this.playerOne.setGravityY(-2 * GRAVITY)
        } else {
          this.playerOne.setGravityY(0)
        }
      }

      if (
        this.playerOne.body.velocity.y < 10 &&
        this.playerOne.isImmersed &&
        this.playerOne.isImmersed !== wasImmersedPreviousFrame &&
        !this.playerOne.respawnedPreviousFrame
      ) {
        this.playerOne.respawnedPreviousFrame = false
        this.playerOne.setGravityY(-GRAVITY)
        this.playerOne.body.setVelocityY(0)
        this.playerOne.isDoneBobbing = true
      }

      if (this.playerOne.isDoneBobbing && this.playerOne.isImmersed) {
        if (this.playerOne.keyInfo.left || this.playerOne.keyInfo.right) {
          this.playerOne.setVelocityY(-20)
          this.playerOne.isDoneBobbing = false
        }
        if (this.playerOne.keyInfo.down) {
          this.playerOne.isDoneBobbing = false
        }
      }

      if (this.#water) {
        // If we're passing through the top layer of water
        const tile = this.getTileAtBottomOfSprite(
          this.playerOne,
          this.#water,
          17
        )
        stickyMessage(tile?.index + ' hey ')

        if (tile) {
          const percentOverlap = this.calculateVerticalOverlap(
            this.playerOne,
            tile
          )

          // this.playerOne.setGravityY(-GRAVITY * (percentOverlap / 100))

          stickyMessage(percentOverlap)
        } else if (this.playerOne.isImmersed) {
          this.playerOne.setGravityY(-2 * GRAVITY)
        }
      }

      if (!this.playerOne.body.blocked.down) {
        this.playerOne?.setDrag(0.75, 0)
        this.isOnGround = false
        if (this.playerOne.keyInfo.right) {
          this.playerOne.setHorizontalAcceleration('right')
        } else if (this.playerOne.keyInfo.left) {
          this.playerOne.setHorizontalAcceleration('left')
        }
      }
    }
  }
}

export default BobberScene
