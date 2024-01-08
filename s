[1mdiff --git a/src/games/platformerTest.ts b/src/games/platformerTest.ts[m
[1mindex 3db780f..0be6098 100644[m
[1m--- a/src/games/platformerTest.ts[m
[1m+++ b/src/games/platformerTest.ts[m
[36m@@ -1,4 +1,5 @@[m
[31m-import { Scene, GameObjects} from 'phaser'[m
[32m+[m[32mimport { Scene, GameObjects } from 'phaser'[m
[32m+[m[32mimport { stickyMessage, toastMessage } from '../debugging/tools'[m
 const WIDTH = 256[m
 const HEIGHT = 240[m
 const GRAVITY = 128[m
[36m@@ -407,77 +408,3 @@[m [mexport class PlatformerTestScene extends Scene {[m
     // clearStickyMessage()[m
   }[m
 }[m
[31m-[m
[31m-function stickyMessage(...messages: any) {[m
[31m-  // console.log(message)[m
[31m-  const prettyMessages: string[] = [][m
[31m-  let identifier[m
[31m-[m
[31m-  identifier = getStackIdentifier()[m
[31m-  for (const message of messages) {[m
[31m-    if (message.hasOwnProperty('_id')) {[m
[31m-      identifier = message._id[m
[31m-      continue[m
[31m-    }[m
[31m-[m
[31m-    prettyMessages.push([m
[31m-      typeof message === 'string' || typeof message === 'number'[m
[31m-        ? String(message)[m
[31m-        : JSON.stringify(message)[m
[31m-    )[m
[31m-  }[m
[31m-[m
[31m-  if (!stackToDivMap[identifier]) {[m
[31m-    console.log('s')[m
[31m-    // Create a new div for this identifier[m
[31m-    let newDiv = document.createElement('div')[m
[31m-    newDiv.textContent = prettyMessages.join(' ')[m
[31m-    const logDiv = document.getElementById('log')[m
[31m-    const messageDiv = logDiv!.appendChild(newDiv)[m
[31m-    messageDiv.classList.add('log-message', 'fade-in')[m
[31m-    stackToDivMap[identifier] = newDiv[m
[31m-  } else {[m
[31m-    // Update the existing div[m
[31m-    stackToDivMap[identifier].textContent = prettyMessages.join(' ')[m
[31m-  }[m
[31m-}[m
[31m-[m
[31m-function clearStickyMessage() {[m
[31m-  const stickyMessage = document.getElementById('sticky-message')[m
[31m-  if (stickyMessage) {[m
[31m-    stickyMessage.innerHTML = ''[m
[31m-  }[m
[31m-}[m
[31m-[m
[31m-function toastMessage(message: any) {[m
[31m-  console.log(message)[m
[31m-  const prettyMessage =[m
[31m-    typeof message === 'string' || typeof message === 'number'[m
[31m-      ? String(message)[m
[31m-      : JSON.stringify(message)[m
[31m-  const logDiv = document.getElementById('log')[m
[31m-  const messageDiv = document.createElement('div')[m
[31m-  messageDiv.classList.add('log-message', 'fade-in')[m
[31m-  logDiv?.appendChild(messageDiv)[m
[31m-  messageDiv?.append(prettyMessage)[m
[31m-  setTimeout(() => {[m
[31m-    messageDiv.classList.add('fade-out')[m
[31m-    setTimeout(() => messageDiv.remove(), 2000)[m
[31m-  }, 7000)[m
[31m-}[m
[31m-[m
[31m-interface IDictionary {[m
[31m-  [index: string]: HTMLElement[m
[31m-}[m
[31m-let stackToDivMap: IDictionary = {}[m
[31m-[m
[31m-function getStackIdentifier() {[m
[31m-  let stack = new Error().stack[m
[31m-  if (stack) {[m
[31m-    let stackLines = stack.split('\n')[m
[31m-    // Use a combination of function name and line number as the identifier[m
[31m-    // Adjust the index based on where the relevant information is in your stack trace[m
[31m-    return stackLines[2] + stackLines[3][m
[31m-  }[m
[31m-  return ''[m
[31m-}[m
[1mdiff --git a/src/main.ts b/src/main.ts[m
[1mindex 0858908..8b6a0ad 100644[m
[1m--- a/src/main.ts[m
[1m+++ b/src/main.ts[m
[36m@@ -1,5 +1,7 @@[m
[32m+[m[32mimport './style.css'[m
 import { Game, Scene, WEBGL } from 'phaser'[m
[31m-import { PlatformerTestScene } from './platformerTest';[m
[32m+[m[32mimport { PlatformerTestScene } from './games/platformerTest';[m
[32m+[m[32mimport { BobberScene } from './games/bobber';[m
 interface IMenuScene {[m
   menu: { scene: string; text: string }[][m
 }[m
[36m@@ -72,7 +74,7 @@[m [mconst config: Phaser.Types.Core.GameConfig = {[m
       // debug: true[m
     },[m
   },[m
[31m-  scene: [MenuScene, PlatformerTestScene],[m
[32m+[m[32m  scene: [MenuScene, PlatformerTestScene, BobberScene],[m
   pixelArt: true,[m
   scale: {[m
     parent: 'game-wrapper',[m
