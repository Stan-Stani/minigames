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

/** Ensures the canvas height does not exceed the viewport height.
 *  Runs once initially and then anytime window is resized. */
function maintainAspectRatio(
  element: HTMLElement | null,
  aspectRatio: number,
  initialRun = true
) {
  if (!element) {
    throw new Error('element argument is falsy!')
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // The width that is in aspect ratio to the viewPortHeight
  let maxCanvasWidth = viewportHeight * aspectRatio

  // Ensure the canvas height does not exceed the viewport height

  if (element) {
    // Have to remove the property to check the vanilla relationship
    element.style.removeProperty('max-width')
    if (
      element.clientWidth > maxCanvasWidth &&
      element.clientHeight > viewportHeight
    ) {
      // force canvas width to conform to aspect ratio
      element.style.maxWidth = `${maxCanvasWidth}px`
    }
  }

  if (initialRun) {
    // Resize the canvas when the window is resized
    window.addEventListener('resize', () =>
      maintainAspectRatio(element, aspectRatio, false)
    )
  }
}

maintainAspectRatio(document.getElementById('game'), 16 / 15)

// BobberScene.teleportCheat = [true, 0, 0]

const HAS_LOCAL_STORAGE = isLocalStorageAvailable()
const toggleStanDebug = () => {
  document.getElementById('info')?.classList.toggle('displayNone')
}
const toggleTeleportCheat = (coordinateArray?: [number, number] | null) => {
  console.log(typeof coordinateArray)
  BobberScene.teleportCheat[0] = !BobberScene.teleportCheat[0]
  if (coordinateArray) {
    BobberScene.teleportCheat = [
      BobberScene.teleportCheat[0],
      ...coordinateArray,
    ]
  } else {
    BobberScene.teleportCheat = [
      !BobberScene.teleportCheat[0],
      ...(BobberScene.teleportCheat.slice(1) as [number, number]),
    ]
  }
  console.log(BobberScene.teleportCheat)
  BobberScene.HAS_LOCAL_STORAGE = HAS_LOCAL_STORAGE
}

// apply local settings from local storage
if (HAS_LOCAL_STORAGE) {
  if (localStorage.getItem('show-stan-debug-stats') === 'TRUE') {
    toggleStanDebug()
  }
  const initialTeleportCheatLocationString =
    localStorage.getItem('teleport-cheat')

  const initialTeleportCheatLocation =
    initialTeleportCheatLocationString === null
      ? null
      : JSON.parse(initialTeleportCheatLocationString)
  if (initialTeleportCheatLocation)
    BobberScene.teleportCheat = initialTeleportCheatLocation
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
type IBuiltMenu = Map<string, Phaser.GameObjects.Text>
interface IMenuScene {
  mainMenuSeed: IMenuItemSeed[]
  settingsMenuSeed: IMenuItemSeed[]
  activeMenu: IBuiltMenu
  mainMenu: IBuiltMenu
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
      text: `Debug Stats = ${
        localStorage.getItem('show-stan-debug-stats') === 'TRUE'
          ? 'TRUE'
          : 'FALSE'
      }`,
      action: () => {
        const item = this.settingsMenu.get('debug')
        if (HAS_LOCAL_STORAGE) {
          const showDebugStats = localStorage.getItem('show-stan-debug-stats')
          if (item) {
            if (showDebugStats === 'FALSE' || !showDebugStats) {
              localStorage.setItem('show-stan-debug-stats', 'TRUE')
              item.text = item.text.replace('FALSE', 'TRUE')
              document.getElementById('info')?.classList.toggle('displayNone')
            } else {
              localStorage.setItem('show-stan-debug-stats', 'FALSE')
              item.text = item.text.replace('TRUE', 'FALSE')
              document.getElementById('info')?.classList.toggle('displayNone')
            }
          }
        }
      },
    },
    {
      id: 'teleport',
      text: `Teleport Cheat = ${
        JSON.parse(
          localStorage.getItem('teleport-cheat') ?? '[false, 0, 0]'
        )[0] !== false
          ? 'TRUE'
          : 'FALSE'
      }`,
      action: () => {
        const item = this.settingsMenu.get('teleport')
        if (HAS_LOCAL_STORAGE) {
          const teleportCheatStorageString =
            localStorage.getItem('teleport-cheat')
          if (item) {
            if (!teleportCheatStorageString) {
              const initalEnablingOfTeleportCheat = [true, 0, 0]
              localStorage.setItem(
                'teleport-cheat',
                JSON.stringify(initalEnablingOfTeleportCheat)
              )
              item.text = item.text.replace('FALSE', 'TRUE')
              toggleTeleportCheat(
                initalEnablingOfTeleportCheat.slice(1) as [number, number]
              )
            } else {
              let teleportCheatTuple = JSON.parse(teleportCheatStorageString)
              teleportCheatTuple[0] = !teleportCheatTuple[0]
              localStorage.setItem(
                'teleport-cheat',
                JSON.stringify(teleportCheatTuple)
              )
              teleportCheatTuple[0] === true
                ? (item.text = item.text.replace('FALSE', 'TRUE'))
                : (item.text = item.text.replace('TRUE', 'FALSE'))
              console.log({ teleportCheatTuple })
              toggleTeleportCheat(teleportCheatTuple.slice(1))
            }
          }
        }
      },
    },
    {
      text: 'Back',
      action: () => {
        this.toggleToMenu(this.mainMenu)
      },
    },
  ]
  activeMenu: IMenuScene['activeMenu'] = new Map()
  mainMenu: IMenuScene['mainMenu'] = new Map()
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
    this.mainMenu = this.setUpMenu(this.mainMenuSeed, true)
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
    width: WIDTH,
    height: HEIGHT,
  }
}

new Game(config)
