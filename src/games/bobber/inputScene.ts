import { Scene } from 'phaser'
import { BobberScene } from './bobber'

export class BobberInputScene extends Scene {
  constructor() {
    super('BobberInputScene')
  }

  create() {
    const BobberScene = this.scene.get<BobberScene>('BobberScene')
    const LeftMobileInput = this.add.rectangle(0, 240, 50, 50, 0xff0000)
    LeftMobileInput.setOrigin(0, 0)
    LeftMobileInput.setInteractive()
    LeftMobileInput.on(
      'pointerdown',
      () => BobberScene.playerOne?.leftButtonDown()
    )
    LeftMobileInput.on('pointerup', () => BobberScene.playerOne?.leftButtonUp())
    LeftMobileInput.on('pointerout', () => BobberScene.playerOne?.leftButtonUp())
    const RightMobileInput = this.add.rectangle(50, 240, 50, 50, 0x0000ff)
    RightMobileInput.setOrigin(0, 0)
    RightMobileInput.setInteractive()
    RightMobileInput.on(
      'pointerdown',
      () => BobberScene.playerOne?.rightButtonDown()
    )
    RightMobileInput.on(
      'pointerup',
      () => BobberScene.playerOne?.rightButtonUp()
    )
    RightMobileInput.on(
      'pointerout',
      () => BobberScene.playerOne?.rightButtonUp()
    )
    const DiveMobileInput = this.add.rectangle(206, 240, 50, 50, 0x00ffff)
    DiveMobileInput.setOrigin(0, 0)
    DiveMobileInput.setInteractive()
    DiveMobileInput.on(
      'pointerdown',
      () => BobberScene.playerOne?.diveButtonDown()
    )
    DiveMobileInput.on('pointerup', () => BobberScene.playerOne?.diveButtonUp())
  }
}
