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

function isHandShakeDatatype(datatype: any): datatype is HandshakeDatatype {
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
interface DPlayerSession {
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
  myTint: number | null
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
    tints: {} & Tints
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
      tints: {
        available: [...TINTS],
        used: [],
        myTint: null,
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

          tints.myTint = tints.consumeRandomTint()
          return tints.myTint
        },
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

    this.me.peer.on('connection', (connIn) => {
      const sessIn = new PlayerSession(connIn, {
        pronouns: { nickname: '' },
        timestamp: null,
        tint: null,
      })
      this.playerSessions.active.set(connIn.peer, sessIn)
      console.log(`Peer (${connIn.peer}) connected.`)
      this.doHandshake(sessIn)
      this.#handleData(connIn)
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

    const peerGroupPromise = new Promise<PeerGroup>((resolve, reject) => {
      mePeer.listAllPeers((peerIds) => {
        peerIdsNotMe = peerIds.filter((id) => id !== this.me.peer?.id)
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
              setTimeout(() => {
                if (this.me.initInfo.tint === null) {
                  const colorfulSessions = [
                    ...this.playerSessions.active,
                  ].filter(([_id, sess]) => sess.initInfo.tint !== null)
                  const tintCounts = TINTS.reduce(
                    (acc, curr) => acc.set(curr, 0),
                    new Map<keyof typeof TINTS, number>()
                  )

                  colorfulSessions.forEach(([id, sess]) => {
                    if (sess.initInfo.tint === null) {
                      throw new Error(
                        `tint should not be ${sess.initInfo.tint}`
                      )
                    }
                    const prevCount = tintCounts.get(sess.initInfo.tint)
                    if (prevCount === undefined) {
                      throw new Error(
                        `tintCount's ${sess.initInfo.tint} should not be ${prevCount}`
                      )
                    }

                    tintCounts.set(sess.initInfo.tint, prevCount + 1)
                  })
                  const ascendingTintCounts = [...tintCounts].sort(
                    ([_keyA, valueA], [_keyB, valueB]) => valueA - valueB
                  )

                  const colorlessSessions = [
                    ...this.playerSessions.active,
                  ].filter(([_id, sess]) => sess.initInfo.tint === null)

                  colorlessSessions.push([
                    mePeer.id,
                    new PlayerSession({} as DataConnection, this.me.initInfo),
                  ])

                  this.ascendingColorlessSessionsByInitTimestamp =
                    colorlessSessions.sort(
                      ([_keyA, valueA], [_keyB, valueB]) => {
                        if (
                          valueA.initInfo.timestamp === null ||
                          valueB.initInfo.timestamp === null
                        ) {
                          throw new Error(`Sess timestamps should not be null.`)
                        }
                        return (
                          valueA.initInfo.timestamp - valueB.initInfo.timestamp
                        )
                      }
                    )
                }
                resolve(this)
              }, 5000)
            }
          }
        })
      })
    })

    return peerGroupPromise
  }

  doHandshake(sess: PlayerSession) {
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

        if (this.ascendingColorlessSessionsByInitTimestamp) {

          const indexThatJustAnnouncedColor =
            this.ascendingColorlessSessionsByInitTimestamp.findIndex(
              ([id, _sess]) => {
                return conn.peer === id
              }
            )
          this.ascendingColorlessSessionsByInitTimestamp.splice(
            indexThatJustAnnouncedColor,
            1
          )

          if (!this.me.peer) {
            throw new Error(`this.me.peer is ${this.me.peer}`)
          }

          if (this.ascendingColorlessSessionsByInitTimestamp[0][0] === this.me.peer.id) {
            this.announce
          }
        }
      } else {
      }
    })
  }
}
