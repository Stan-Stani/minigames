import './style.css'
import { Game, Scene, WEBGL } from 'phaser'
import { PlatformerTestScene } from './games/platformerTest'
import { BobberScene, IPlayer } from './games/bobber/bobber'
import { BobberInputScene, InputScene } from './games/bobber/inputScene'

import Peer, { DataConnection } from 'peerjs'
import {
  connectToPeer,
  getPeerIdsAsync,
  PeerGroup,
  registerWithPeerServerAsync,
  talkToPeers,
} from './packages/multiplayer/multiplayer'

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
function manageAspectRatio(
  element: HTMLElement | null,
  aspectRatioConfig: {
    landscape: { width: number; height: number }
    portrait: { width: number; height: number }
  },
  game: Phaser.Game,
  initialRun = true
) {
  if (!element) {
    throw new Error('element argument is falsy!')
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // // The width that is in aspect ratio to the viewPortHeight
  // let maxCanvasWidth = viewportHeight * aspectRatio

  // // Ensure the canvas height does not exceed the viewport height

  // if (element) {
  //   // Have to remove the property to check the vanilla relationship
  //   element.style.removeProperty('max-width')
  //   if (
  //     element.clientWidth > maxCanvasWidth &&
  //     element.clientHeight > viewportHeight
  //   ) {
  //     // force canvas width to conform to aspect ratio
  //     element.style.maxWidth = `${maxCanvasWidth}px`
  //   }
  // }

  if (viewportWidth >= viewportHeight) {
    game.scale.setGameSize(
      aspectRatioConfig.landscape.width,
      aspectRatioConfig.landscape.height
    )
  } else {
    game.scale.setGameSize(
      aspectRatioConfig.portrait.width,
      aspectRatioConfig.portrait.height
    )
  }

  if (initialRun) {
    // Resize the canvas when the window is resized
    window.addEventListener('resize', () =>
      manageAspectRatio(element, aspectRatioConfig, game, false)
    )
  }
}

// BobberScene.teleportCheat = [true, 0, 0]

const HAS_LOCAL_STORAGE = isLocalStorageAvailable()
BobberScene.HAS_LOCAL_STORAGE = HAS_LOCAL_STORAGE
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
const GAME_HEIGHT = 240
const MOBILE_INPUT_HEIGHT = 50
const GRAVITY = 128

const canvas = document.getElementById('game') as HTMLCanvasElement
// https://stackoverflow.com/questions/51217147/how-to-use-a-local-font-in-phaser-3
function loadFont(family: string, url: string) {
  var newFont = new FontFace(family, `url('${url}')`)
  newFont
    .load()
    .then(function (loaded) {
      document.fonts.add(loaded)
    })
    .catch(function (error) {
      console.error(error)
    })
}
// https://www.dafont.com/early-gameboy.font
loadFont('gameboy', './Early GameBoy.ttf')

const SCREEN_CENTER = [WIDTH / 2, GAME_HEIGHT / 2]
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
  peerGroup = new PeerGroup()

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
    {
      text: 'Connect to Peers',
      action: async () => {
        ;(
          await this.peerGroup.registerWithPeerServerAsync()
        ).openConnectionsAsync()
      },
    },
    // {
    //   text: 'List peers',
    //   action: () => {
    //     getPeerIdsAsync ? getPeerIdsAsync() : undefined
    //   },
    // },
    // {
    //   text: 'Connect to Peers',
    //   action: () => {
    //     conn = peerMe ? connectToPeer(peerMe) : undefined
    //   },
    // },
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
      text: `Teleport Cheat:\n numpad1 and numpad2\n = ${
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
  peerStatusText: Phaser.GameObjects.Text | undefined

  // https://newdocs.phaser.io/docs/3.55.2/Phaser.Tilemaps.TilemapLayer#putTilesAt

  preload() {
    this.peerGroup
      .registerWithPeerServerAsync()
      .then((peerGroup) => peerGroup.openConnectionsAsync())
      .then((peerGroup) => {
        this.peerStatusText = this.add.text(
          (WIDTH / 10) * 9,
          (GAME_HEIGHT / 10) * 7,
          `connected \nto ${peerGroup.activeConnections.length} peers`,
          FONT_OPTIONS
        )
        this.peerStatusText.setOrigin(1, 0)
      })

    this.peerGroup.peerMe?.on('connection', () => {
      this.peerStatusText?.setText(
        `connected \nto ${this.peerGroup.activeConnections.length} peers`
      )
    })
  }

  setUpMenu(menuItems: IMenuItemSeed[], isActive: boolean) {
    const builtMenu: IBuiltMenu = new Map()
    menuItems.forEach((menuItem, index) => {
      const yCoord = (function putLastItemAtBottom() {
        return menuItems.length - 1 !== index
          ? GAME_HEIGHT / 10 + LINE_HEIGHT * index
          : GAME_HEIGHT - LINE_HEIGHT
      })()

      let text = this.add
        .text(WIDTH / 10, yCoord, menuItem.text, FONT_OPTIONS)
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
    this.registry.set({ peerGroup: this.peerGroup })
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
  height: GAME_HEIGHT,
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
    ['bobberInput', BobberInputScene],
  ]),
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'game-wrapper',
    width: WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    activePointers: 3,
  },
  dom: {
    createContainer: true,
  },
}

const game = new Game(config)

manageAspectRatio(
  document.getElementById('game'),
  {
    landscape: { width: 256, height: GAME_HEIGHT },
    portrait: { width: 256, height: GAME_HEIGHT + MOBILE_INPUT_HEIGHT },
  },
  game
)

// Thanks Claude 3.5 Sonnet!
if (import.meta.hot) {
  console.log('HMR is enabled')

  // https://vitejs.dev/guide/api-hmr#hot-accept-deps-cb
  // for (const path in sceneModules) {
  import.meta.hot.accept(['./games/bobber.ts'], (newModules) => {
    console.log(newModules[0])
    const newModule = newModules[0]
    console.log(`Accepting update for module: ./games/bobber.ts'`)
    try {
      console.log('New module loaded:', newModule)
      const sceneName = newModule.default.name
      const newScene: BobberScene = new newModule.default()
      console.log(newScene)
      if (newScene instanceof Phaser.Scene) {
        console.log(`Hot-reloading scene: ${sceneName}`)
        console.log(game.scene.getScene(sceneName))
        const oldScene = game.scene.getScene<BobberScene>(sceneName)

        let isActive = false
        let oldPlayerOne: IPlayer | undefined
        if (game.scene.isActive(sceneName)) {
          isActive = true
          oldPlayerOne = oldScene.playerOne
        }
        if (game.scene.getScene(sceneName)) {
          console.log(`Removing existing scene: ${sceneName}`)
          game.scene.remove(sceneName)
        }

        console.log(`Adding new scene: ${sceneName}`)
        game.scene.add(sceneName, newScene, false)

        if (isActive) {
          console.log(`Restarting scene: ${sceneName}`)
          console.log(oldPlayerOne.x)

          game.scene.start(sceneName)
          newScene.playerOne.x = oldPlayerOne.x
          newScene.playerOne.y = oldPlayerOne.y
        }
      } else {
        console.log('Loaded module is not a Phaser Scene:', newModule)
      }
    } catch (error) {
      console.error('Error during hot-reload:', error)
    }
  })
  // }

  import.meta.hot.dispose(() => {
    console.log('HMR dispose called')
    game.destroy(false)
  })
}

// // Testing
// getPeersAsync()
// joinPeerServer()
