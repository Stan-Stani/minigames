import { Scene } from 'phaser'
import { BobberScene } from './bobber'

export class BobberInputScene extends Scene {
  constructor() {
    super('BobberInputScene')
  }

  preload() {
    this.load.aseprite({
      key: 'inputArrow',
      textureURL: './input/inputArrowAlt.png',
      atlasURL: './input/inputArrowAlt.json',
    })
  }

  create() {
    const leftMobileInput = this.add.sprite(0, 240, 'inputArrow')
    this.anims.createFromAseprite('inputArrow', undefined, leftMobileInput)
    const BobberScene = this.scene.get<BobberScene>('BobberScene')
    leftMobileInput.setOrigin(0, 0)
    leftMobileInput.setInteractive()
    leftMobileInput.on('pointerdown', () => {
      BobberScene.playerOne?.leftButtonDown()
      leftMobileInput.setFrame(1)
    })
    leftMobileInput.on('pointerup', () => {
      BobberScene.playerOne?.leftButtonUp()
      leftMobileInput.setFrame(0)
    })
    leftMobileInput.on('pointerout', () => {
      BobberScene.playerOne?.leftButtonUp()
      leftMobileInput.setFrame(0)
    })
    const rightMobileInput = this.add.sprite(50, 240, 'inputArrow')
    rightMobileInput.setFlipX(true)
    this.anims.createFromAseprite('inputArrow', undefined, rightMobileInput)
    rightMobileInput.setOrigin(0, 0)

    rightMobileInput.setInteractive()
    rightMobileInput.on('pointerdown', () => {
      BobberScene.playerOne?.rightButtonDown()
      rightMobileInput.setFrame(1)
    })
    rightMobileInput.on('pointerup', () => {
      BobberScene.playerOne?.rightButtonUp()
      rightMobileInput.setFrame(0)
    })
    rightMobileInput.on('pointerout', () => {
      BobberScene.playerOne?.rightButtonUp()
      rightMobileInput.setFrame(0)
    })
    

    const downMobileInput = this.add.sprite(206, 240, 'inputArrow')
    downMobileInput.setAngle(-90)
    // Still want origin in upper left of sprite from player's perspective
    downMobileInput.setOrigin(1, 0)
    downMobileInput.setPosition(206, 240)
    this.anims.createFromAseprite('inputArrow', undefined, rightMobileInput)

    downMobileInput.setInteractive()
    downMobileInput.on('pointerdown', () => {
      BobberScene.playerOne?.diveButtonDown()
      downMobileInput.setFrame(1)
    })
    downMobileInput.on('pointerup', () => {
      BobberScene.playerOne?.diveButtonUp()
      downMobileInput.setFrame(0)
    })
  }
}
