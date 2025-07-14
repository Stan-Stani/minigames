import { Scene } from 'phaser'
import BobberScene from './bobber'
import { stickyMessage } from '../../debugging/tools'
import Peer, { DataConnection } from 'peerjs'
import { MultiplayerManager } from './MultiplayerManager'
import { DataManager } from './MultiplayerManager/DataManager'

export interface PlayerLike extends Player {}
interface multiplayerConfig {
  multiplayerManager?: MultiplayerManager
  /** The player's remote peer connection.
   * @note If defined, then this is a network player. If not,
   * then this is a client player.
   */
  myPeerPlayerConn?: DataConnection
}

export interface Player
  extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
  multiplayerConfig?: multiplayerConfig
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
  myTint: number | undefined
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  myTint: number | undefined = undefined
  constructor(
    scene: BobberScene,
    multiplayerConfig?: {
      multiplayerManager?: MultiplayerManager
      myPeerPlayerConn?: DataConnection
    }
  ) {
    if (!scene.initialSpawn) {
      throw new Error('initialSpawn is falsy')
    }
    super(scene, scene.initialSpawn.x, scene.initialSpawn.y, 'player')
    this.multiplayerConfig = multiplayerConfig

    scene.add.existing(this)

    if (this.multiplayerConfig?.myPeerPlayerConn) {
      console.log('attempting to initialize player')
    }

    if (this.multiplayerConfig?.myPeerPlayerConn) {
      if (!this.multiplayerConfig.multiplayerManager) {
        debugger
      }
      const myPlayerSession =
        this.multiplayerConfig?.multiplayerManager?.playerSessionsContainer.active.get(
          this.multiplayerConfig.myPeerPlayerConn.peer
        )
      console.log(
        'peer trying to add',
        this.multiplayerConfig.myPeerPlayerConn.peer,
        this.multiplayerConfig
      )

      if (!myPlayerSession) {
        throw new Error(`myPlayerSession is ${myPlayerSession}`)
      }
      if (myPlayerSession.initInfo.tint) {
        this.setTint(myPlayerSession.initInfo.tint)
        this.myTint = myPlayerSession.initInfo.tint
      }
    } else {
      if (this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint) {
        // Don't set tint until/unless another player connects
        if (
          (this.multiplayerConfig?.multiplayerManager?.playerSessionsContainer
            ?.active?.size ?? 0) > 0
        ) {
          this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint &&
            this.setTint(
              this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint
            )
        }

        this.setDepth(-4)
      }
    }

    scene.physics.add.existing(this)

    this.multiplayerConfig?.myPeerPlayerConn?.on('close', () => {
      this.scene.raceProgressBar?.removePlayerIndicator(this)
      this.destroy()
    })

    this.body.setSize(10, 14).setOffset(this.body.offset.x, 3)

    this.body.setBounce(0.3)
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
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
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

    if (this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig.multiplayerManager?.dataManager?.on(
        'playerSnapshot',
        (snapshot) => {
          if (snapshot.keyInfo.right) {
            this.rightButtonDown()
          } else if (!snapshot.keyInfo.right) {
            this.rightButtonUp()
          }
          if (snapshot.keyInfo.left) {
            this.leftButtonDown()
          } else if (!snapshot.keyInfo.left) {
            this.leftButtonUp()
          }
          if (snapshot.keyInfo.down) {
            this.diveButtonDown()
          } else if (!snapshot.keyInfo.down) {
            this.diveButtonUp()
          }
          this.setX(snapshot.x)
          this.setY(snapshot.y)
          this.setVelocityX(snapshot.xVelocity)
          this.setVelocityY(snapshot.yVelocity)
        }
      )

      this.multiplayerConfig.multiplayerManager?.dataManager?.on(
        'handshake',
        (handshake) => {
          handshake.initInfo.tint && this.setTint(handshake.initInfo.tint)
          this.myTint = handshake.initInfo.tint ?? undefined
        }
      )
      const myPeerPlayerConn = this.multiplayerConfig?.myPeerPlayerConn
      myPeerPlayerConn.on('data', (data) => {
        // Can't figure out how to get network players to be behind local
        // player other than this
        this.setDepth(-4)
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
            // Need this check for handling case where
            // I've destroyed the Player after they disconnected
            if (this.scene) {
              this.scene.tweens.add({
                targets: pixel,
                alpha: { from: 1, to: 0 },
                duration: 500,
                onComplete: () => {
                  pixel.destroy()
                },
              })
            }
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
      if (!this.multiplayerConfig?.myPeerPlayerConn) {
        this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
          DataManager.extractSnapshot(this)
        )
      }
    }
  }

  diveButtonUp = () => {
    this.keyInfo.down = false
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
        DataManager.extractSnapshot(this)
      )
    }
  }

  rightButtonDown = () => {
    this.keyInfo.right = true
    this.setHorizontalAcceleration('right')
    this.isRunning = true
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
        DataManager.extractSnapshot(this)
      )
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
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
        DataManager.extractSnapshot(this)
      )
    }
  }

  leftButtonDown = () => {
    this.keyInfo.left = true
    this.setHorizontalAcceleration('left')
    this.isRunning = true
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
        DataManager.extractSnapshot(this)
      )
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
    if (!this.multiplayerConfig?.myPeerPlayerConn) {
      this.multiplayerConfig?.multiplayerManager?.announceSnapshot(
        DataManager.extractSnapshot(this)
      )
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
    // Need this check for handling case where
    // I've destroyed the Player after they disconnected
    if (!this || !this.body) {
      return
    }

    // Don't set tint until/unless another player connects
    if (
      this.multiplayerConfig?.myPeerPlayerConn === undefined &&
      (this.multiplayerConfig?.multiplayerManager?.playerSessionsContainer
        ?.active?.size ?? 0) > 0
    ) {
      this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint &&
        this.setTint(
          this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint
        )
      this.myTint =
        this.multiplayerConfig?.multiplayerManager?.meNode.initInfo.tint ??
        undefined
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

    this.scene.raceProgressBar?.updatePosition(this)
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
