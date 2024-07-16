import { Scene } from 'phaser'

export class BobberInputScene extends Scene {
  constructor() {
    super('BobberInputScene')
  }

  create() {
   const BobberScene = this.scene.get('BobberScene')
    const LeftMobileInput = this.add.rectangle(20, 240, 25, 25, 0xff0000)
    LeftMobileInput.setOrigin(0, 0)
    LeftMobileInput.setInteractive()
    LeftMobileInput.on('pointerdown', () => console.log('boo'))
    const RightMobileInput = this.add.rectangle(45, 240, 25, 25, 0x0000FF)
    RightMobileInput.setOrigin(0, 0)
    RightMobileInput.setInteractive()
    RightMobileInput.on('pointerdown', () => console.log('boo'))
     const DiveMobileInput = this.add.rectangle(220, 240, 25, 25, 0x00ffff)
     DiveMobileInput.setOrigin(0, 0)
     DiveMobileInput.setInteractive()
     DiveMobileInput.on('pointerdown', () =>
       BobberScene.events.emit('diveButtonDown')
       
    )
    // Need special logic for if pointer moves off of button and then mouse ups
     DiveMobileInput.on('pointerup', () =>
       BobberScene.events.emit('diveButtonUp')
       
     )
  }
}
