import Peer, { DataConnection } from 'peerjs'
import { Player } from '../../games/bobber/Player'

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

interface PlayerSnapshotDatatype<T extends {}> {
  type: 'playerSnapshot'
  value: T
}

type Datatype<T extends {}> = HandshakeDatatype | PlayerSnapshotDatatype<T>

export function isHandShakeDatatype(
  datatype: any
): datatype is HandshakeDatatype {
  return 'type' in datatype && datatype.type === 'handshake'
}
function isPlayerSnapshotDatatype(
  datatype: any
): datatype is HandshakeDatatype {
  return 'type' in datatype && datatype.type === 'playerSnapshot'
}
/** D for Duck, as in Duck Typing. Basically IPlayerSession but
 * with a more semantic name. A POJO that captures the essence of a
 * {@link PlayerSession}.
 */
export interface DPlayerSession {
  connection: DataConnection
  initInfo: InitInfo
}

class PlayerSession implements DPlayerSession {
  connection: DataConnection
  initInfo: InitInfo

  constructor(connection: DataConnection, initInfo: DPlayerSession['initInfo'])
  constructor(duck: DPlayerSession)
  constructor(
    connectionOrDuck: DataConnection | DPlayerSession,
    initInfo?: DPlayerSession['initInfo']
  ) {
    if ('connection' in connectionOrDuck && 'initInfo' in connectionOrDuck) {
      this.connection = connectionOrDuck.connection
      this.initInfo = connectionOrDuck.initInfo
    } else {
      this.connection = connectionOrDuck as DataConnection
      if (initInfo !== undefined) {
        this.initInfo = initInfo
      } else {
        throw new Error(
          'initInfo must be provided when using individual parameters'
        )
      }
    }
  }
}

interface Tints {
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
  consumeRandomTint(this: Tints): number
  /** Returns the consumed tint. */
  consumeTint(this: Tints, tint: number): number
  /** Returns the consumed tint. */
  decideMyTint(this: Tints): number
}

const TINTS = [
  0xff5733, // Bright red-orange
  0x33ff57, // Bright green
  0x3357ff, // Bright blue
  0xf3ff33, // Bright yellow
  0xf033ff, // Bright magenta
  0x33fff3, // Bright cyan
  0x8033ff, // Purple
  0xff338a, // Pink
  0xff9933, // Orange
  0x99ff33, // Lime
  0x33ff99, // Mint
  0x3399ff, // Sky blue
  0x9933ff, // Violet
  0xffd433, // Gold
  0x33ffd4, // Turquoise
  0xd433ff, // Lavender
  0xff3333, // Red
  0x33ff33, // Green
  0x6b33ff, // Indigo
  0xff33d4, // Hot pink
] as const

export class PeerGroup {
  me: {
    peer: Peer | undefined
    initInfo: InitInfo
    state: null | {
      type: 'wait_for_tint_turn'
      ascendingColorlessByJoinTime: [string, PlayerSession][]
    }
  }

  tints: Tints = {
    available: [...TINTS],
    used: [],

    moveRandomTint(source, destination) {
      const indexToRemove = Math.floor(Math.random() * source.length)

      const movedTint = source.splice(indexToRemove, 1)[0]

      destination.push(movedTint)

      return movedTint
    },

    consumeRandomTint() {
      const tints = this

      /** Returns moved tint */

      if (tints.available.length < 1) {
        tints.available = [...tints.used]

        tints.used = []
      }

      return tints.moveRandomTint(this.available, this.used)
    },

    consumeTint(tint: number) {
      const tints = this

      const indexToRemove = tints.available.findIndex((t) => t === tint)

      return tints.available.splice(indexToRemove, 1)[0]
    },

    decideMyTint() {
      const tints = this

      const chosenTint = tints.consumeRandomTint()

      return chosenTint
    },
  }

  playerSessions = {
    /** key is peer Id of DataConnection */
    active: new Map<string, PlayerSession>(),
    /** key is peer Id of DataConnection */
    failed: new Map<string, PlayerSession>(),
  }

  ascendingColorlessSessionsByInitTimestamp: [string, PlayerSession][] | null =
    null

  constructor() {
    this.me = {
      peer: undefined,
      initInfo: {
        timestamp: Date.now(),
        pronouns: { nickname: 'Breq' },
        tint: null,
      },
    }
  }

  /** Returned promise resolves with the same peerGroup after
   *  this.me.peer connects to the Peer Server */
  registerWithPeerServerAsync(this: PeerGroup) {
    this.me.peer = new Peer({
      host: '192.168.86.138',
      port: 41361,
      path: '/',
    })

    const peerGroupPromise = new Promise<typeof this>((resolve, reject) => {
      try {
        this.me.peer?.on('open', (id) => {
          console.log('My Peer ID is: ' + id)
          resolve(this)
        })
      } catch (error) {
        reject(error)
      }
    })

    return peerGroupPromise
  }

  /** Try to connect to all peers currently registered on the Peer Server.
   * @returns `Promise<PeerGroup>` resolving to the same peer group
   * 5 seconds after has tried to open connections with all peer
   */
  openConnectionsAsync(this: PeerGroup) {
    const mePeer = this.me.peer
    if (!mePeer) {
      throw new Error(`mePeer is ${mePeer}.`)
    }
    let peerIdsNotMe: string[] = []

    mePeer.on('connection', (connIn) => {
      connIn.on('open', () => {
        const sessIn = new PlayerSession(connIn, {
          pronouns: { nickname: '' },
          timestamp: null,
          tint: null,
        })
        this.playerSessions.active.set(connIn.peer, sessIn)
        console.log(`Peer (${connIn.peer}) connected.`)
        this.#handleData(connIn)
        this.doHandshake(sessIn)
      })
    })

    const peerGroupPromise = new Promise<PeerGroup>((resolve, reject) => {
      mePeer.listAllPeers((peerIds) => {
        peerIdsNotMe = peerIds.filter((id) => id !== this.me.peer?.id)

        const establishTint = () => {
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

        if (peerIdsNotMe.length) {
          peerIdsNotMe.forEach((id, index, arr) => {
            const connOut = mePeer.connect(id)

            try {
              // Peer Server waits 5 minutes to remove peers from its list
              // so some likely are no longer active players. Best I can do
              // is try to handshake with all peers, then wait 5 seconds
              // and assume I've got all active players.
              connOut?.on('open', () => {
                console.log(`Connected to Peer (${id}).`)
                const sessOut = new PlayerSession(connOut, {
                  pronouns: { nickname: '' },
                  tint: null,
                  timestamp: null,
                })
                this.playerSessions.active.set(id, sessOut)
                this.doHandshake(sessOut)
                this.#handleData(connOut)
              })
            } catch (error) {
              this.playerSessions.failed.set(
                id,
                new PlayerSession(connOut, {
                  pronouns: { nickname: '' },
                  tint: null,
                  timestamp: null,
                })
              )
              console.error(error)
              reject(error)
            } finally {
              if (index === arr.length - 1) {
                // Allow some time to try to
                // complete handshake with all active players
                establishTint()
              }
            }
          })
        } else {
          establishTint()
        }
      })
    })

    return peerGroupPromise
  }

  doHandshake(sess: PlayerSession) {
    console.log('I send handshake', this.me.initInfo.tint)
    const data: HandshakeDatatype = {
      type: 'handshake',
      initInfo: this.me.initInfo,
    }
    sess.connection.send(data)
  }

  announce<T>(data: T) {
    this.playerSessions.active.forEach((sess) => sess.connection.send(data))
  }

  #handleData(conn: DataConnection) {
    conn.on('data', (data) => {
      console.log(`Peer (${conn.peer}) sent: `, data)

      if (isHandShakeDatatype(data)) {
        const sess = this.playerSessions.active.get(conn.peer)
        if (!sess) {
          throw new Error(`Sess is ${sess}.`)
        }
        sess.initInfo = data.initInfo

        if (sess.initInfo.tint) {
          this.tints.consumeTint(sess.initInfo.tint)
        }

        if (this.me.state?.type === 'wait_for_tint_turn') {
          console.log('hey')
          const indexWhoAnnouncedColor =
            this.me.state.ascendingColorlessByJoinTime.findIndex(
              ([id, _sess]) => {
                conn.peer === id
              }
            )

          const myIndex = this.me.state.ascendingColorlessByJoinTime.findIndex(
            ([id, _sess]) => {
              this.me.peer?.id === id
            }
          )

          if (indexWhoAnnouncedColor === myIndex - 1) {
            this.me.initInfo.tint = this.tints.decideMyTint()
            const data: HandshakeDatatype = {
              type: 'handshake',
              initInfo: this.me.initInfo,
            }
            console.log('i announce my color after waiting. I am ', myIndex)
            this.announce(data)
          }
        }
      } else {
      }
    })
  }
}
