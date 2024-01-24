import './style.css'
import { Game, Scene, WEBGL } from 'phaser'
import { PlatformerTestScene } from './games/platformerTest'
import { BobberScene } from './games/bobber'
interface IMenuItemSeed {
  id?: string
  text: string
  action: () => any
}

//https://stackoverflow.com/questions/16427636/check-if-localstorage-is-available
function isLocalStorageAvailable() {
  var test = 'test'
  try {
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    const message = 'Local storage not detected. Save data will not persist.'
    console.error(message, e)
    alert(message)
    return false
  }
}

const HAS_LOCAL_STORAGE = isLocalStorageAvailable()

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
type IBuiltMenu = Map<string, Phaser.GameObjects.Text>
interface IMenuScene {
  mainMenuSeed: IMenuItemSeed[]
  settingsMenuSeed: IMenuItemSeed[]
  activeMenu: IBuiltMenu
  settingsMenu: IBuiltMenu
}

class MenuScene extends Scene implements IMenuScene {
  toggleToScene = (sceneIndicator: Parameters<typeof this.scene.start>[0]) => {
    this.scene.stop()
    this.scene.start(sceneIndicator)
  }
  toggleToMenu = (menu: IBuiltMenu) => {
    this.activeMenu.forEach((text) => {
      text.setVisible(false)
    })
    this.activeMenu = menu
    this.activeMenu.forEach((text) => {
      text.setVisible(true)
    })
  }
  mainMenuSeed: IMenuScene['mainMenuSeed'] = [
    {
      text: 'Bobber',
      action: () => {
        this.toggleToScene('BobberScene')
      },
    },
    {
      text: 'Platformer Logic Test',
      action: () => {
        this.scene.stop()
        this.toggleToScene('PlatformerTestScene')
      },
    },
    {
      text: 'Settings',
      action: () => {
        this.toggleToMenu(this.settingsMenu)
      },
    },
  ]

  

  settingsMenuSeed: IMenuScene['settingsMenuSeed'] = [
    {
      id: 'debug',
      text: `Debug Stats = False`,
      action: () => {
        const item = this.settingsMenu.get('debug')
        if (HAS_LOCAL_STORAGE) {
          localStorage.getItem('show-debug-stats')
          if (item) {
            if (
              localStorage.getItem('show-debus-stats') === 'FALSE' ||
              !localStorage.getItem('show-debug-stats')
            ) {
              localStorage.setItem('show-debug-stats', 'TRUE')
              item.text = item.text.replace('False', 'True')
            } else {
              localStorage.setItem('show-debug-stats', 'FALSE')
              item.text = item.text.replace('True', 'False')
            }
          }
        }
      },
    },
  ]
  activeMenu: IMenuScene['activeMenu'] = new Map()
  settingsMenu: IMenuScene['settingsMenu'] = new Map()

  // https://newdocs.phaser.io/docs/3.55.2/Phaser.Tilemaps.TilemapLayer#putTilesAt

  preload() {}

  setUpMenu(menuItems: IMenuItemSeed[], isActive: boolean) {
    const builtMenu: IBuiltMenu = new Map()
    menuItems.forEach((menuItem, index) => {
      let text = this.add
        .text(
          WIDTH / 10,
          HEIGHT / 10 + LINE_HEIGHT * index,
          menuItem.text,
          FONT_OPTIONS
        )
        // .setOrigin(0.5, 1)
        .setInteractive()
        .on('pointerover', () => {
          text.setStyle({ fill: '#ff0' })
        })
        .on('pointerout', () => {
          text.setStyle({ fill: '#fff' })
        })
        .on('pointerup', () => {
          menuItem.action()
        })

      if (menuItem.id) {
        builtMenu.set(menuItem.id, text)
      } else {
        builtMenu.set(menuItem.text, text)
      }
      if (isActive) {
        this.activeMenu = builtMenu
      } else {
        text.setVisible(false)
      }
    })
    return builtMenu
  }
  create() {
    this.setUpMenu(this.mainMenuSeed, true)
    this.settingsMenu = this.setUpMenu(this.settingsMenuSeed, false)
  }
}

function getSceneToLoadFromURL(
  sceneTuples: [string, Phaser.Types.Scenes.SceneType][]
) {
  const queryString = window.location.search
  const urlSearchParams = new URLSearchParams(queryString)
  const gameQueryValue = urlSearchParams.get('game')
  console.log(gameQueryValue)
  const sceneNames = sceneTuples.map((tuple) => tuple[0])
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
  scene: getSceneToLoadFromURL([
    ['menu', MenuScene],
    ['platformertest', PlatformerTestScene],
    ['bobber', BobberScene],
  ]),
  pixelArt: true,
  scale: {
    parent: 'game-wrapper',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
}

new Game(config)
