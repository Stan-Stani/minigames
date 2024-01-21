import './style.css'
import { Game, Scene, WEBGL } from 'phaser'
import { PlatformerTestScene } from './games/platformerTest'
import { BobberScene } from './games/bobber'
interface IMenuScene {
  menu: { scene: string; text: string }[]
}
const WIDTH = 256
const HEIGHT = 240
const GRAVITY = 128

const canvas = document.getElementById('game') as HTMLCanvasElement

const SCREEN_CENTER = [WIDTH / 2, HEIGHT / 2]
const FONT_SIZE = 16
const LINE_HEIGHT = 21
const FONT_OPTIONS = {
  fontSize: `${FONT_SIZE}px`,
  fill: '#FFF',
  fontStyle: 'bold',
}

class MenuScene extends Scene implements IMenuScene {
  menu = [
    { scene: 'BobberScene', text: 'Bobber' },
    { scene: 'PlatformerTestScene', text: 'Platformer Logic Test' },
  ]

  preload() {}

  setUpMenu(menu: IMenuScene['menu']) {
    menu.forEach((menuItem, index) => {
      const menuPosition = [...SCREEN_CENTER]
      let text = this.add
        .text(
          menuPosition[0],
          menuPosition[1] + LINE_HEIGHT * index,
          menuItem.text,
          FONT_OPTIONS
        )
        .setOrigin(0.5, 1)
        .setInteractive()
        .on('pointerover', () => {
          text.setStyle({ fill: '#ff0' })
        })
        .on('pointerout', () => {
          text.setStyle({ fill: '#fff' })
        })
        .on('pointerup', () => {
          if (menuItem.scene && menuItem.scene === 'PlayScene') {
            this.scene.stop()
            this.scene.resume(menuItem.scene)
          } else {
            this.scene.stop('MenuScene')
            this.scene.start(menuItem.scene)
          }
        })
    })
  }
  create() {
    this.setUpMenu(this.menu)
  }
}

function getSceneToLoad(sceneTuples: [string, Phaser.Types.Scenes.SceneType][]) {
  const queryString = window.location.search
  const urlSearchParams = new URLSearchParams(queryString)
  const gameQueryValue = urlSearchParams.get('game')
  console.log(gameQueryValue)
  const sceneNames = sceneTuples.map(
    (tuple) => tuple[0]
  )
  const scenes = sceneTuples.map((tuple) => tuple[1])
  const sceneIndexToInit = gameQueryValue
    ? sceneNames.indexOf(gameQueryValue)
    : 0
  if (sceneIndexToInit > 0) {
    const sceneToInit = scenes[sceneIndexToInit]
    scenes.splice(sceneIndexToInit, 1)
    scenes.unshift(sceneToInit)
  }

  return scenes
}

const config: Phaser.Types.Core.GameConfig = {
  type: WEBGL,
  width: WIDTH,
  height: HEIGHT,
  canvas,
  physics: {
    default: 'arcade',
    arcade: {
      // pixels per second
      gravity: { y: GRAVITY },
      // debug: true
    },
  },
  scene: getSceneToLoad([['menu', MenuScene], ['platformertest', PlatformerTestScene], ['bobber', BobberScene]]),
  pixelArt: true,
  scale: {
    parent: 'game-wrapper',
    // mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // width: WIDTH,
    // height: HEIGHT
  },
}

new Game(config)
