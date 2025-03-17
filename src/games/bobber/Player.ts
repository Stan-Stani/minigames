import { Scene } from 'phaser'
import BobberScene from './bobber'
import { stickyMessage } from '../../debugging/tools'
import Peer, { DataConnection } from 'peerjs'
import {
  isHandShakeDatatype,
  PeerGroup,
} from '../../packages/PeerGroup'

export interface PlayerLike extends Player {}
interface PeerConfig {
  peerGroup?: PeerGroup
  /** The player's remote peer connection.
   * @note If defined, then this is a network player. If not,
   * then this is a client player.
   */
  myPeerPlayerConn?: DataConnection
}

export interface Player
  extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
  peerConfig?: PeerConfig
  scene: BobberScene
  brakingInfo: {
    isBraking: boolean
    // direction body was moving when braking started
    directionBeforeBraking?: 'right' | 'left'
  }
  keyInfo: {
    right: boolean
    left: boolean
    dive: boolean
    down: boolean
    numPadOne: boolean
    numPadTwo: boolean
  }
  isOnGround: boolean
  isRunning: boolean
  isImmersed: boolean
  isDoneBobbing: boolean
  respawn?: (coordArr?: [number, number]) => void
  respawnedPreviousFrame?: boolean
  respawnDestination?: [number, number]
  teleportDestination?: [number, number]
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body
  static #tints: { available: number[]; used: number[] } = {
    available: [
      0xff5733, // Bright red-orange
      0x33ff57, // Bright green
      0x3357ff, // Bright blue
      0xf3ff33, // Bright yellow
      0xf033ff, // Bright magenta
      0x33fff3, // Bright cyan
      0x8033ff, // Purple
      0xff338a, // Pink
      0xff9933, // Orange
      0x99ff33, // Lime
      0x33ff99, // Mint
      0x3399ff, // Sky blue
      0x9933ff, // Violet
      0xffd433, // Gold
      0x33ffd4, // Turquoise
      0xd433ff, // Lavender
      0xff3333, // Red
      0x33ff33, // Green
      0x6b33ff, // Indigo
      0xff33d4, // Hot pink
    ],
    used: [],
  }
  myTint: number | undefined = undefined
  constructor(
    scene: BobberScene,
    peerConfig?: { peerGroup?: PeerGroup; myPeerPlayerConn?: DataConnection }
  ) {
    if (!scene.initialSpawn) {
      throw new Error('initialSpawn is falsy')
    }
    super(scene, scene.initialSpawn.x, scene.initialSpawn.y, 'player')
    this.peerConfig = peerConfig

    scene.add.existing(this)

    if (this.peerConfig?.myPeerPlayerConn) {
      const myPlayerSession =
        this.peerConfig.peerGroup?.playerSessions.active.get(
          this.peerConfig.myPeerPlayerConn.peer
        )
      if (!myPlayerSession) {
        throw new Error(`myPlayerSession is ${myPlayerSession}`)
      }
      if (myPlayerSession.initInfo.tint) {
        this.setTint(myPlayerSession.initInfo.tint)
      }
    } else {
      if (this.peerConfig?.peerGroup?.me.initInfo.tint) {
        this.setTint(this.peerConfig?.peerGroup?.me.initInfo.tint)
      }
    }

    scene.physics.add.existing(this)

    this.body.setSize(10, 14).setOffset(this.body.offset.x, 3)

    this.body.setBounce(0.3)
    if (this.peerConfig?.myPeerPlayerConn) {
      // this.body.setAllowGravity(false)
      this.setDepth(-2)
      // this.meAndPeerGroup.connMe.on('data', (data) => {
      //   this.setX(data?.x)
      //   this.setY(data?.y)
      // })
    }
    this.brakingInfo = {
      isBraking: false,
      directionBeforeBraking: undefined,
    }
    this.keyInfo = {
      left: false,
      right: false,
      down: false,
      dive: false,
      numPadOne: false,
      numPadTwo: false,
    }
    this.setDamping(true)
    this.isImmersed = false
    this.isDoneBobbing = false
    this.setDepth(-1)
    this.teleportDestination = BobberScene.teleportCheat.slice(1) as [
      number,
      number,
    ]
    if (!this.peerConfig?.myPeerPlayerConn) {
      scene.cameras.main.startFollow(this, true)
    }
    this.respawn = (dest) => {
      this.setPosition(...(dest ?? this.teleportDestination ?? [0, 0]))
        .setVelocity(0, 0)
        .setAcceleration(0, 0)
      this.isImmersed = false
      this.setGravityY(0)
      this.setAngle(0)
      this.isDoneBobbing = false
      this.respawnedPreviousFrame = true
    }
    this.respawnedPreviousFrame = false

    if (this.peerConfig?.myPeerPlayerConn) {
      const myPeerPlayerConn = this.peerConfig?.myPeerPlayerConn
      myPeerPlayerConn.on('data', (data) => {
        if (isHandShakeDatatype(data)) {
          console.log('meow!')
          data.initInfo.tint && this.setTint(data.initInfo.tint)
        } else {
          if (data.keyInfo.right) {
            this.rightButtonDown()
          } else if (!data.keyInfo.right) {
            this.rightButtonUp()
          }
          if (data.keyInfo.left) {
            this.leftButtonDown()
          } else if (!data.keyInfo.left) {
            this.leftButtonUp()
          }
          if (data.keyInfo.down) {
            this.diveButtonDown()
          } else if (!data.keyInfo.down) {
            this.diveButtonUp()
          }
          this.setX(data.x)
          this.setY(data.y)
        }
      })
    }

    const dustCollision = (
      [minX, maxX]: [number, number],
      [minY, maxY]: [number, number]
    ) => {
      for (let i = 0; i < 10; i++) {
        // Create a physics sprite using the 'pixel' texture at random positions
        let x = Phaser.Math.Between(minX, maxX)
        let y = Phaser.Math.Between(minY, maxY)
        let pixel = this.scene.physics.add.sprite(x, y, 'pixel')
        pixel.setTint(this.myTint)
        pixel.setGravityY(-this.scene.GRAVITY + 60)

        // Set properties on the physics body, if desired
        //   pixel.body.setCollideWorldBounds(true)
        pixel.body.setBounce(0.5)
        pixel.body.setVelocity(
          Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(-20, 20)
        )

        this.scene.physics.add.collider(pixel, this.scene.platforms!)
        this.scene.physics.add.collider(pixel, this.scene.kill!)

        this.scene.time.delayedCall(
          5000,
          () => {
            this.scene.tweens.add({
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
    const managePlatformCollisions = () => {
      const playerBody = this.body as Phaser.Physics.Arcade.Body
      playerBody.onCollide = true
      if (this.scene.platforms) {
        this.scene.physics.add.collider(this, this.scene.platforms, () => {
          if (!this.isOnGround && playerBody?.blocked.down) {
            dustCollision(
              [this.x! - this.width! / 2, this.x! + this.width! / 2],
              [this.y! + this.height! / 2, this.y! + this.height! / 2]
            )
            this.setDrag(0.2, 0)
          }

          this.isOnGround = true
          // @todo Is the below even necessary?
          // @todo Logic for reinstating movement if a left or right key is held down
          if (this.keyInfo.right) {
            this.setHorizontalAcceleration('right')
          } else if (this.keyInfo.left) {
            this.setHorizontalAcceleration('left')
          }
        })
      }
    }

    managePlatformCollisions()
  }

  // Using arrow functions to prevent Phaser from
  // rebinding the methods' thises
  diveButtonDown = () => {
    if (this.isImmersed) {
      this.setVelocityY(100)
      this.keyInfo.down = true
      if (!this.peerConfig?.myPeerPlayerConn) {
        const { keyInfo, x, y } = this
        const data = { keyInfo, x, y }
        this.peerConfig?.peerGroup?.announce(data)
      }
    }
  }

  diveButtonUp = () => {
    this.keyInfo.down = false
    if (!this.peerConfig?.myPeerPlayerConn) {
      const { keyInfo, x, y } = this
      const data = { keyInfo, x, y }
      this.peerConfig?.peerGroup?.announce(data)
    }
  }

  rightButtonDown = () => {
    this.keyInfo.right = true
    this.setHorizontalAcceleration('right')
    this.isRunning = true
    if (!this.peerConfig?.myPeerPlayerConn) {
      const { keyInfo, x, y } = this
      const data = { keyInfo, x, y }
      this.peerConfig?.peerGroup?.announce(data)
    }
  }

  rightButtonUp = () => {
    this.keyInfo.right = false
    // This conditional is so we don't set accel to 0 when releasing
    // the right key if both the left and right key are pressed, and
    // the object is currently accelerating left
    if ((this?.body.acceleration?.x ?? 0) > 0) {
      this?.setAccelerationX(0)
      this.brakingInfo = {
        isBraking: false,
        directionBeforeBraking: undefined,
      }
    }
    this.isRunning = false
    if (!this.peerConfig?.myPeerPlayerConn) {
      const { keyInfo, x, y } = this
      const data = { keyInfo, x, y }
      this.peerConfig?.peerGroup?.announce(data)
    }
  }

  leftButtonDown = () => {
    this.keyInfo.left = true
    this.setHorizontalAcceleration('left')
    this.isRunning = true
    if (!this.peerConfig?.myPeerPlayerConn) {
      const { keyInfo, x, y } = this
      const data = { keyInfo, x, y }
      this.peerConfig?.peerGroup?.announce(data)
    }
  }

  leftButtonUp = () => {
    this.keyInfo.left = false
    // See right key up event explanation
    if ((this?.body.acceleration?.x ?? 0) < 0) {
      this?.setAccelerationX(0)
      this.brakingInfo = {
        isBraking: false,
        directionBeforeBraking: undefined,
      }
    }
    this.isRunning = false
    if (!this.peerConfig?.myPeerPlayerConn) {
      const { keyInfo, x, y } = this
      const data = { keyInfo, x, y }
      this.peerConfig?.peerGroup?.announce(data)
    }
  }

  setTeleportButtonDown = () => {
    if (this && BobberScene.teleportCheat[0]) {
      const dest: [number, number] = [this.x, this.y]
      if (BobberScene.HAS_LOCAL_STORAGE) {
        localStorage.setItem('teleport-cheat', JSON.stringify([true, ...dest]))
      }
      this.teleportDestination = dest
    }
  }

  invokeTeleportButtonDown = () => {
    if (
      this &&
      this.teleportDestination &&
      BobberScene.teleportCheat[0] &&
      this.respawn
    ) {
      this.respawn()
    }
  }

  /** Attempts to set the acceleration of the player in the given direction */
  setHorizontalAcceleration = (direction: 'left' | 'right') => {
    let baseAcceleration: number
    /** Returns true if player is accelerating in direction of
     * current velocity
     */
    let conditionalResultToUse: boolean
    let directionBeforeBraking: 'left' | 'right'
    if (direction === 'left') {
      baseAcceleration = -30
      conditionalResultToUse = (this.body.velocity?.x ?? 0) <= 0
      directionBeforeBraking = 'right'
      // this.setFlipX(true)
    } else if (direction === 'right') {
      baseAcceleration = 30
      conditionalResultToUse = (this.body.velocity?.x ?? 0) >= 0
      directionBeforeBraking = 'left'
      // this.setFlipX(false)
    } else {
      return
    }
    if (conditionalResultToUse && this.isOnGround) {
      this.setAccelerationX(baseAcceleration)
    } else if (this.isOnGround) {
      // else we are trying to slow down while sliding in the other direction

      this.brakingInfo = {
        isBraking: true,
        directionBeforeBraking: directionBeforeBraking,
      }
      this.setAccelerationX(2 * baseAcceleration)
    } else if (this.isImmersed) {
      this.setAccelerationX(baseAcceleration * 2)
    } else if (!this.isOnGround) {
      this.setAccelerationX(baseAcceleration / 2)
    }
  }

  update(_time: number, delta: number) {
    if (this.peerConfig?.myPeerPlayerConn === undefined) {
      this.peerConfig?.peerGroup?.me.initInfo.tint &&
        this.setTint(this.peerConfig?.peerGroup?.me.initInfo.tint)
    }

    if (this.keyInfo.right && this.body.acceleration.x > 0) {
      if (this.angle <= 30) {
        this.angle += 0.06 * delta
      }
    } else if (this.keyInfo.left && this.body.acceleration.x < 0) {
      if (this.angle >= -30) {
        this.angle -= 0.06 * delta
      }
      // Experiencing drag
    } else if (this.body.acceleration.x === 0 && this.body.velocity.x !== 0) {
      if (this.angle < 0) {
        this.angle += 0.03 * delta
      } else if (this.angle > 0) {
        this.angle -= 0.03 * delta
      }
    }

    if (!this.scene.initialSpawn) return

    const nullIfOutsideLevel = this.scene.water?.getTileAtWorldXY(
      this.body.x + this.body.width / 2,
      this.body.y + this.body.height / 2,
      true
    )

    if (nullIfOutsideLevel === null) {
      if (!this.respawn) {
        return
      }
      this.respawn(this.respawnDestination)
    }

    // Don't waste time calculating super small velocity endlessly for drag
    if (
      Math.abs(this.body?.velocity.x ?? 0) < 0.1 &&
      this.body?.acceleration.x === 0
    ) {
      this.body.velocity.x = 0
    }

    // Transition from increased abs value of deceleration of braking (60) to running's acceleration (30)
    if (this.brakingInfo.isBraking) {
      if (
        this.brakingInfo.directionBeforeBraking === 'right' &&
        this.body.velocity.x < 0
      ) {
        this.body.setAccelerationX(-30)
        this.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
      if (
        this.brakingInfo.directionBeforeBraking === 'left' &&
        this.body.velocity.x > 0
      ) {
        this.body.setAccelerationX(30)
        this.brakingInfo = {
          isBraking: false,
          directionBeforeBraking: undefined,
        }
      }
    }

    if (this.body) {
      // if (!this.isRunning && this.playerOne?.body?.velocity.x) {
      //   this.body.velocity.x *= Math.pow(friction, deltaInSeconds)

      //   // Stop the sprite if the velocity is very low
      //   if (Math.abs(this.body.velocity.x) < 0.1) {
      //     this.body.velocity.x = 0
      //   }
      // }

      const tile = this.scene.water?.getTileAtWorldXY(
        this.body.x + this.body.width / 2,
        this.body.y + this.body.height / 3
      )
      let wasImmersedPreviousFrame = this.isImmersed
      if (tile?.index === 17 || tile?.index === 33) {
        this.isImmersed = true
      } else {
        this.isImmersed = false
      }
      if (this.isImmersed !== wasImmersedPreviousFrame) {
        const magnitudeReduction = 1
        const playerVelocity = this.body.velocity.y
        if (playerVelocity > 0) {
          this.body.setVelocityY(playerVelocity - magnitudeReduction)
        } else if (playerVelocity < 0) {
          this.body.setVelocityY(playerVelocity + magnitudeReduction)
        }
      }
      stickyMessage({ isImmersed: this.isImmersed })

      if (!this.isDoneBobbing) {
        if (this.isImmersed) {
          this.setGravityY(-2 * this.scene.GRAVITY)
        } else {
          this.setGravityY(0)
        }
      }

      if (
        this.body.velocity.y < 10 &&
        this.isImmersed &&
        this.isImmersed !== wasImmersedPreviousFrame &&
        !this.respawnedPreviousFrame
      ) {
        this.respawnedPreviousFrame = false
        this.setGravityY(-this.scene.GRAVITY)
        this.body.setVelocityY(0)
        this.isDoneBobbing = true
      }

      if (this.isDoneBobbing && this.isImmersed) {
        if (this.keyInfo.left || this.keyInfo.right) {
          this.setVelocityY(-20)
          this.isDoneBobbing = false
        }
        if (this.keyInfo.down) {
          this.isDoneBobbing = false
        }
      }

      if (this.scene.water) {
        // If we're passing through the top layer of water
        const tile = this.getTileAtBottomOfSprite(this, this.scene.water, 17)
        stickyMessage(tile?.index + ' hey ')

        if (tile) {
          const percentOverlap = this.calculateVerticalOverlap(this, tile)

          // this.setGravityY(-GRAVITY * (percentOverlap / 100))

          stickyMessage(percentOverlap)
        } else if (this.isImmersed) {
          this.setGravityY(-2 * this.scene.GRAVITY)
        }
      }
    }

    if (!this.body.blocked.down) {
      this.setDrag(0.75, 0)
      this.isOnGround = false
      if (this.keyInfo.right) {
        this.setHorizontalAcceleration('right')
      } else if (this.keyInfo.left) {
        this.setHorizontalAcceleration('left')
      }
    }
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
}
