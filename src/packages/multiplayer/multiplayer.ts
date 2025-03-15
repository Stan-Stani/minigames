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

interface HandshakeDatatype {
  type: 'handshake'
  pronouns: Pronouns
}
type Datatype<T extends {}> =
  | { type: 'handshake'; pronouns: Pronouns }
  | { type: 'playerSnapshot'; value: T }

function isHandShakeDatatype(datatype: any): datatype is HandshakeDatatype {
  return 'type' in datatype && datatype.type === 'handshake'
}
/** D for Duck, as in Duck Typing. Basically IPlayerSession but
 * with a more semantic name. A POJO that captures the essence of a
 * {@link PlayerSession}.
 */
interface DPlayerSession {
  connection: DataConnection
  pronouns: Pronouns
}

class PlayerSession implements DPlayerSession {
  connection: DataConnection
  pronouns: Pronouns

  constructor(connection: DataConnection, pronouns: Pronouns)
  constructor(duck: DPlayerSession)
  constructor(
    connectionOrDuck: DataConnection | DPlayerSession,
    maybePronouns?: Pronouns
  ) {
    if ('connection' in connectionOrDuck && 'pronouns' in connectionOrDuck) {
      this.connection = connectionOrDuck.connection
      this.pronouns = connectionOrDuck.pronouns
    } else {
      this.connection = connectionOrDuck as DataConnection
      if (maybePronouns !== undefined) {
        this.pronouns = maybePronouns
      } else {
        throw new Error(
          'Pronouns must be provided when using individual parameters'
        )
      }
    }
  }
}

export class PeerGroup {
  me: { peer: Peer | undefined; pronouns: Pronouns }

  playerSessions = {
    /** key is connectionId of DataConnection */
    active: new Map<string, PlayerSession>(),
    /** key is connectionId of DataConnection */
    failed: new Map<string, PlayerSession>(),
  }

  constructor() {
    this.me = { peer: undefined, pronouns: { nickname: 'Breq' } }
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
      this.playerSessions.active.set(
        connIn.connectionId,
        new PlayerSession(connIn, { nickname: '' })
      )
      console.log(`Peer (${connIn.peer}) connected.`)
      connIn.on('data', (data) => {
        console.log(`Peer (${connIn.peer}) sent: `, data)

        if (isHandShakeDatatype(data)) {
          this.playerSessions.active.set(
            connIn.connectionId,
            new PlayerSession(connIn, data.pronouns)
          )
        }
      })
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

  /** Connect to all peers currently registered on the Peer Server.
   * @returns `Promise<PeerGroup>` resolving to the same peer group
   * after waiting for all outgoing connections to open or fail.
   */
  openConnectionsAsync(this: PeerGroup) {
    if (!this.me.peer) {
      throw new Error(`this.peerMe is ${this.me.peer}.`)
    }
    let peerIdsNotMe: string[] = []

    const peerGroupPromise = new Promise<PeerGroup>(
      (resolve, reject) =>
        this.me.peer?.listAllPeers((peerIds) => {
          let attemptedOutConns = 0
          peerIdsNotMe = peerIds.filter((id) => id !== this.me.peer?.id)
          peerIdsNotMe.forEach((id, index, arr) => {
            const connOut = this.me.peer?.connect(id)
            connOut && this.playerSessions.active.set(id, connOut)
            try {
              connOut?.on('open', () => {
                console.log(`Connected to Peer (${id}).`)
                attemptedOutConns++
              })
              connOut?.on('data', (data) => {
                console.log(`Peer (${id}) sent `, data)
              })
            } catch (error) {
              console.error(error)
              reject(error)
              attemptedOutConns++
            } finally {
              if (index === arr.length - 1) {
                resolve(this)
              }
            }
            // this.peerMe?.
          })
        })
    )

    return peerGroupPromise
  }

  announce<T>(data: T) {
    this.activeConnections.forEach((conn) => conn.send(data))
  }
}
