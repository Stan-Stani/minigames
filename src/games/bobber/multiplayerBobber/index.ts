import Peer from 'peerjs'

class MultiplayerBobber {
  /** Represents the "Peer"/Player that lives on this device.  */
  meNode: {
    peerMe: Peer | undefined
    initInfo: InitInfo
    state: null | {
      type: 'wait_for_tint_turn'
      ascendingColorlessByJoinTime: [string, PlayerSession][]
    }
  }

  establishTint = () => {
    setTimeout(() => {
      const activePlayerSessions = this.playerSessions.active
      if (this.playerSessions.active.size >= TINTS.length) {
        /** @todo */
        // just pick and broadcast a random color
        debugger
      } else {
        const colorlessSessions = [...activePlayerSessions].filter(
          ([_id, sess]) => sess.initInfo.tint === null
        )
        colorlessSessions.push([
          mePeer.id,
          new PlayerSession({} as DataConnection, this.me.initInfo),
        ])
        const colorlessIncludingMe = colorlessSessions
        const ascendingColorlessByJoinTime = colorlessIncludingMe.sort(
          ([_keyA, valueA], [_keyB, valueB]) => {
            if (
              valueA.initInfo.timestamp === null ||
              valueB.initInfo.timestamp === null
            ) {
              throw new Error(`Sess timestamps should not be null.`)
            }

            return valueA.initInfo.timestamp - valueB.initInfo.timestamp
          }
        )

        // console.log('colorlessSessions', colorlessSessions.length)
        // console.log(
        //   'asc',
        //   ascendingColorlessByJoinTime[0][0],
        //   'me',
        //   mePeer.id
        // )
        console.log({ ascendingColorlessByJoinTime })
        if (ascendingColorlessByJoinTime[0][0] === mePeer.id) {
          console.log('BINGO')
          this.me.initInfo.tint = this.tints.decideMyTint()
          const data: HandshakeDatatype = {
            type: 'handshake',
            initInfo: this.me.initInfo,
          }
          console.log('me first')
          this.announce(data)
        } else {
          console.log('WAIT')
          this.me.state = {
            type: 'wait_for_tint_turn',
            ascendingColorlessByJoinTime,
          }
        }
      }

      resolve(this)
    }, 5000)
  }
}

interface Tinter {
  available: number[]
  used: number[]
  /** Returns moved tint */
  moveRandomTint(source: number[], destination: number[]): number
  /**
   * If no available tints, resets `available` to
   * all tints and clears used tints. Then gets random.
   *
   * Returns the consumed tint.
   *
   */
  consumeRandomTint(this: Tinter): number
  /** Returns the consumed tint. */
  consumeTint(this: Tinter, tint: number): number
  /** Returns the consumed tint. */
  decideMyTint(this: Tinter): number
}

/**
 * Represents the self-determined identity of a user.
 * No errors if the nick already exists.
 */
interface Pronouns {
  /** Text that identifies this player. Will be randomly assigned
   * if player doesn't enter a nickname.
   */
  nickname: string
}

interface InitInfo {
  pronouns: Pronouns
  timestamp: number | null
  tint: number | null
}

interface HandshakeDatatype {
  type: 'handshake'
  initInfo: InitInfo
}

type Datatype<T extends {}> = HandshakeDatatype | PlayerSnapshotDatatype<T>
