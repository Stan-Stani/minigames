import { Scene } from 'phaser'
import BobberScene from './bobber'
import { stickyMessage } from '../../debugging/tools'
import Peer, { DataConnection } from 'peerjs'
import { PeerGroup } from '../../packages/multiplayer/multiplayer'

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
        if (data.right) {
          this.rightButtonDown()
        } else if (!data.right) {
          this.rightButtonUp()
        }
      })
    }
  }

  // Using arrow functions to prevent Phaser from
  // rebinding the methods' thises
  diveButtonDown = () => {
    if (this.isImmersed) {
      console.log('Lalonde', 'imm')
      this.setVelocityY(100)
      this.keyInfo.down = true
      if (!this.peerConfig?.myPeerPlayerConn) {
        this.peerConfig?.peerGroup?.announce(this.keyInfo)
      }
    }
  }

  diveButtonUp = () => {
    this.keyInfo.down = false
  }

  rightButtonDown = () => {
    this.keyInfo.right = true
    this.setHorizontalAcceleration('right')
    this.isRunning = true
    if (!this.peerConfig?.myPeerPlayerConn) {
      this.peerConfig?.peerGroup?.announce(this.keyInfo)
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
      this.peerConfig?.peerGroup?.announce(this.keyInfo)
    }
  }

  leftButtonDown = () => {
    this.keyInfo.left = true
    this.setHorizontalAcceleration('left')
    this.isRunning = true
  }

  leftButonUp = () => {
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
      // this.playerOne?.setFlipX(true)
    } else if (direction === 'right') {
      baseAcceleration = 30
      conditionalResultToUse = (this.body.velocity?.x ?? 0) >= 0
      directionBeforeBraking = 'left'
      // this.playerOne?.setFlipX(false)
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

  managePlatformCollisions() {
    const playerBody = this.body as Phaser.Physics.Arcade.Body

    playerBody.onCollide = true
    if (this.scene.platforms) {
      this.scene.physics.add.collider(this, this.scene.platforms, () => {
        console.log('block')
        // if (!this.scene.isOnGround && this.playerOne?.body?.blocked.down) {
        //   dustCollision(
        //     [
        //       this.playerOne?.x! - this.playerOne?.width! / 2,
        //       this.playerOne?.x! + this.playerOne?.width! / 2,
        //     ],
        //     [
        //       this.playerOne?.y! + this.playerOne?.height! / 2,
        //       this.playerOne?.y! + this.playerOne?.height! / 2,
        //     ]
        //   )
        //   this.playerOne?.setDrag(0.2, 0)
        // }

        // The sprite hit the bottom side of the world bounds
        // this.isOnGround = true
        // // @todo Is the below even necessary?
        // // @todo Logic for reinstating movement if a left or right key is held down
        // if (this.playerOne?.keyInfo.right) {
        //   this.playerOne.setHorizontalAcceleration('right')
        // } else if (this.playerOne?.keyInfo.left) {
        //   this.playerOne.setHorizontalAcceleration('left')
        // }

        // down && onHitBottom(playerBody.gameObject)
      })
    }
  }

  update(_time: number, delta: number) {
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
  }
}
