# minigames

## Live App
https://stan-stani.github.io/minigames/

---

## Notes
Blurry Text Fix: https://discord.com/channels/244245946873937922/416623653741133837/1341522782189654119
"so the way I've handled this for a game that needed it was to create a "global scale" value that is based on the window.devicePixelRatio value (which I pass into Math.ceil to get the next highest integer value). then I multiply everything by that value - the game canvas size (in the Phaser Game Config), any exact positions (such as myObj.x = value * globalScale), and font sizes. I then load image assets that are based on this pixel density too - my designer provides me with 3 versions of every file, the "normal" size, 2x size, and 3x size. I only load the size that I need based on the pixel density. this solves the text blurriness issue and also fixes graphics having the same problem (which is generally harder to spot but of course the designers notice it lol)"