# minigames

## Live App
https://stan-stani.github.io/minigames/

### Bobber

#### ToDo

    - Make mobile interface clearer; that is, make controls look like controls!

#### Known Bugs

    - Very rarely a player will fall upwards when bobbing and 
    get killed at top of the map
        - That also happens to network players more often but
        they don't actually die and will reappear on the next
        sent snapshot
    - Rarely, a player might not connect with all the currently 
    connected peers.
    - Network players aren't shown in their actual positions until they move
    after the client player has connected