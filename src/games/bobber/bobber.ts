import { GameObjects, Scene } from 'phaser'
import { BobberInputScene } from './inputScene'
import {
  clearStickyMessage,
  stickyMessage,
  toastMessage,
} from '../../debugging/tools'
import { Player } from './Player'
import { PeerGroup } from '../../packages/PeerGroup'
import { ConnectionType } from 'peerjs'
import { MultiplayerManager } from './MultiplayerManager'
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
  GRAVITY = GRAVITY
  static teleportCheat: [boolean, number, number] = [false, 0, 0]
  static HAS_LOCAL_STORAGE = false
  multiplayerManager: MultiplayerManager | undefined = undefined
  inspectorScene: any
  #timerText?: GameObjects.Text
  playerOne?: Player
  peerPlayerArr?: Player[] = []
  // @ts-ignore
  #generatedPlatforms: (Phaser.GameObjects.Image & {
    body: Phaser.Physics.Arcade.StaticBody
  })[] = []
  platforms?: Phaser.Tilemaps.TilemapLayer
  water?: Phaser.Tilemaps.TilemapLayer
  kill?: Phaser.Tilemaps.TilemapLayer | null
  initialSpawn?: spawnLocation
  isRunning = false
  teleportDestination = BobberScene.teleportCheat?.slice(1) as [number, number]
  winText: GameObjects.Text | null = null
  sceneStartTime = 0

  makeBuoyComposite(x: number, y: number) {
    if (!this.platforms) {
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

    this.physics.add.collider(buoy, this.platforms)

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

  preload() {
    this.load.image('background1', './bobber/background1.png')
    this.load.image('player', './bobber/player.png')
    this.load.image('enemy', './enemy.png')
    this.load.image('flag', './bobber/entities/flag.png')
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
    this.load.aseprite({
      key: 'skeletonWalk',
      textureURL: './bobber/entities/skeletonWalk.png',
      atlasURL: './bobber/entities/skeletonWalk.json',
    })

    this.load.image('tiles', './bobber/tiles.png')
    this.load.tilemapTiledJSON('tilemapLevel1', './bobber/level1.json')
  }

  create() {
    this.sceneStartTime = this.time.now
    if (!this.registry.get('multiplayerManager')) {
      this.multiplayerManager = new MultiplayerManager()
      this.registry.set({ multiplayerManager: this.multiplayerManager })
    } else {
      this.multiplayerManager = this.registry.get('multiplayerManager')
    }
    this.scene.launch('BobberInputScene')
    this.#timerText = this.add.text(WIDTH * 0.8, HEIGHT * 0.05, '00', {
      fontSize: `10px`,
      color: '#FFF',
      fontFamily: 'gameboy',
    })
    this.#timerText.setDepth(9001)

    const background = this.add.image(0, 0, 'background1')
    background.setOrigin(0, 0).setDepth(-4).setScrollFactor(0)

    this.physics.world.setBounds(0, 0, WIDTH * 11, HEIGHT)
    this.cameras.main.setBounds(0, 0, 1024 * 4, HEIGHT)

    const map = this.make.tilemap({ key: 'tilemapLevel1' })
    const tileset = map.addTilesetImage('tiles', 'tiles')

    const spawnLayer = map.getObjectLayer('Spawn')
    const textLayer = map.getObjectLayer('text')
    const signageLayer = map.getObjectLayer('signage')

    if (textLayer && textLayer.objects) {
      // Iterate through all objects in the layer
      textLayer.objects.forEach((object) => {
        // Check if this is a text object (text objects in Tiled have a 'text' property)
        if (object.text) {
          // Create text properties from the Tiled object
          const textConfig: {
            x: number | undefined
            y: number | undefined
            text: any
            style: Phaser.Types.GameObjects.Text.TextStyle
          } = {
            x: object.x,
            y: object.y,
            text: object.text.text, // The actual text content
            style: {
              font: (object.text.pixelsize ?? '16') + 'px ' + 'gameboy',
              color: object.text.color || '#000000',
              align: object.text.halign || 'center',
            },
          }

          // Create the text object in Phaser
          const textObject = this.add.text(
            textConfig.x,
            textConfig.y,
            textConfig.text,
            textConfig.style
          )

          // Handle text alignment and origin
          if (object.text.halign === 'center') {
            textObject.setOrigin(0.5, 0)
          } else if (object.text.halign === 'right') {
            textObject.setOrigin(1, 0)
          }

          textObject.setVisible(false)
          this.winText = textObject
        }
      })
    }

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
      // this.initialSpawn = {x: 158 * 16, y: 7 * 16}
      this.water = map.createLayer('water', tileset)!
      this.water!.setCollisionByExclusion([-1], true)
      this.platforms = map.createLayer('platforms', tileset)!
      this.platforms!.setCollisionByExclusion([-1], true)
      this.kill = map.createLayer('kill', tileset)
      this.playerOne = new Player(this, {
        multiplayerManager: this.multiplayerManager,
      })

      if (signageLayer && signageLayer.objects) {
        signageLayer.objects.forEach((flagObject) => {
          if (flagObject.x && flagObject.y) {
            const flag = this.physics.add.sprite(
              flagObject?.x,
              flagObject?.y,
              'flag'
            )
            flag.setImmovable(true)
            flag.body.setAllowGravity(false)
            flag.setOrigin(0, 1)

            if (this.playerOne) {
              const overlap = this.physics.add.overlap(
                flag,
                this.playerOne,
                () => {
                  if (!this.playerOne) {
                    return
                  }

                  this.winText?.setVisible(true)

                  // activationParticles.play({
                  //   key: 'default',
                  //   hideOnComplete: true,
                  //   showOnStart: true,
                  // })

                  // this.playerOne.respawnDestination = [x, y]

                  overlap.destroy()
                }
              )
            }
          }
        })
      }

      if (!this.initialSpawn) throw new Error()

      this.multiplayerManager?.playerSessionsContainer.active.forEach(
        (sess) => {
          const peerPlayer = new Player(this, {
            multiplayerManager: this.multiplayerManager,
            myPeerPlayerConn: sess.connection,
          })

          this.peerPlayerArr?.push(peerPlayer)
        }
      )

      /**
       * @section A
       *  I don't like how I'm having to manually handle
       * initializing players here. It feels like it should be
       * something that happens not explicitly in this scene, but
       * maybe I just need to extract the below to a method on the
       * Multiplayer Manager?
       */
      // Handle player joining while bobber game is running
      console.log('attaching peer initializer to peerGroup')
      this.multiplayerManager?.peerGroup.onConnOpen((conn) => {
        this.peerPlayerArr?.push(
          new Player(this, {
            multiplayerManager: this.multiplayerManager,
            myPeerPlayerConn: conn,
          })
        )
      })

      console.log('iterating over existing connections to add players')
      this.multiplayerManager?.playerSessionsContainer.active.forEach((ps) => {
        console.log(
          'loading peer that was already connected before my game started'
        )
        this.peerPlayerArr?.push(
          new Player(this, {
            multiplayerManager: this.multiplayerManager,
            myPeerPlayerConn: ps.connection,
          })
        )
      })

      /** @endSection A */

      checkpoints.forEach((cp) => {
        this.makeBuoyComposite(cp.x, cp.y)
      })

      const skeletonWalk = this.physics.add.sprite(50, 100, 'skeletonWalk')
      skeletonWalk.setImmovable(true)

      skeletonWalk.body.setAllowGravity(false)
      skeletonWalk.setDepth(-2)

      const thisanim = this.anims.createFromAseprite(
        'skeletonWalk',
        undefined,
        skeletonWalk
      )
      skeletonWalk.play({ key: 'default', repeat: -1 })

      if (!this.kill) {
        throw new Error(`kill is ${this.kill} but cannot be falsy`)
      }

      this.kill.setCollisionByExclusion([-1], true)

      this.physics.add.collider(this.playerOne, this.kill, () => {
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
          .on('up', this.playerOne.leftButtonUp)

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
  }

  // time ends up being since initial scene loaded
  update(time: number, delta: number) {
    const fullSeconds = Math.floor((time - this.sceneStartTime) / 1000)
    const fullMinutes = Math.floor(fullSeconds / 60)
    const remainderSeconds = fullSeconds % 60
    const timeString = `${fullMinutes}:${
      remainderSeconds < 10 ? '0' + remainderSeconds : remainderSeconds
    }`
    !this.winText?.visible && this.#timerText?.setText(timeString)
    this.#timerText?.setScrollFactor(0)
    stickyMessage(
      'playerOne Net Gravity:',
      (this.playerOne?.body.gravity.y ?? 0) + GRAVITY
    )
    stickyMessage('playerOne Velocity:', this.playerOne?.body?.velocity)
    stickyMessage('playerOne Acceleration:', this.playerOne?.body?.acceleration)
    stickyMessage('brakingInfo:', this.playerOne?.brakingInfo)
    if (!this.playerOne || !this.initialSpawn) return

    this.playerOne.update(time, delta)
    this.peerPlayerArr?.forEach((p) => {
      p.update(time, delta)
    })

    // @ts-ignore
    // stickyMessage(this.playerOne?.body?.drag)

    // stickyMessage(this.playerOne?.body?.velocity)

    // Apply friction factor to the player's velocity and make it frame rate independent
  }
}

export default BobberScene
