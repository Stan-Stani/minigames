import BobberScene from './bobber'

export interface PlayerLike extends Player {}

export interface Player
  extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
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
  constructor(scene: BobberScene) {
    if (!scene.initialSpawn) {
      throw new Error('initialSpawn is falsy')
    }
    super(scene, scene.initialSpawn.x, scene.initialSpawn.y, 'player')
    scene.add.existing(this)
    scene.physics.add.existing(this)

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
    scene.cameras.main.startFollow(this, true)
    this.respawn = (dest = scene.teleportDestination) => {
      if (!this) return
      this.setPosition(...dest)
        .setVelocity(0, 0)
        .setAcceleration(0, 0)
      this.isImmersed = false
      this.setGravityY(0)
      this.isDoneBobbing = false
      this.respawnedPreviousFrame = true
    }
    this.respawnedPreviousFrame = false
  }

  // Using arrow functions to prevent Phaser from
  // rebinding the methods' thises
  diveButtonDown = () => {
    if (this.isImmersed) {
      console.log('Lalonde', 'imm')
      this.setVelocityY(100)
      this.keyInfo.down = true
    }
  }

  diveButtonUp = () => {
    this.keyInfo.down = false
    console.log('Lalonde', 'diveButtonUp')
  }

  rightButtonDown = () => {
    this.keyInfo.right = true
    this.setHorizontalAcceleration('right')
    this.isRunning = true
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
}
