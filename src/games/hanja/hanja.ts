import { Scene } from 'phaser'

const FONT_OPTIONS = {
  fontSize: `90px`,
  fill: '#FFF',
  color: '#FFF',
  fontFamily: 'sans-serif',
  resolutions: 1,
}
export class HanjaScene extends Scene {
  constructor() {
    super('HanjaScene')
  }

  create() {
    this.add.text(1, 60, 'hey 人', FONT_OPTIONS)
  }
}
