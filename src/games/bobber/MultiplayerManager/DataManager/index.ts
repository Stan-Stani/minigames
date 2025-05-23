import { DataConnection } from 'peerjs'
import { Player } from '../../Player'
import { InitInfo } from '../PlayerSession/InitInfo'

export interface HandshakeDatatype {
  type: 'handshake'
  initInfo: InitInfo
}

export interface PlayerSnapshotDatatype {
  type: 'playerSnapshot'
  keyInfo: Player['keyInfo']
  x: number
  y: number
  xVelocity: number
  yVelocity: number
}

export type Datatype = HandshakeDatatype | PlayerSnapshotDatatype

interface EventMap {
  handshake: HandshakeDatatype
  playerSnapshot: PlayerSnapshotDatatype
}

type DataManagerEventName = keyof EventMap

export class DataManager {
  constructor(conn: DataConnection) {
    conn.on('data', (data) => {
      if (DataManager.isHandShakeDatatype(data)) {
        this.handshakeEventHandlers.forEach((eH) => {
          eH(data)
        })
      } else if (DataManager.isPlayerSnapshotDatatype(data)) {
        this.playerSnapShotEventHandlers.forEach((eH) => {
          eH(data)
        })
      } else {
        debugger
      }
    })
  }

  handshakeEventHandlers: ((data: HandshakeDatatype) => void)[] = []
  playerSnapShotEventHandlers: ((data: PlayerSnapshotDatatype) => void)[] = []

  on<E extends DataManagerEventName>(
    eventName: E,
    handler: (data: EventMap[E]) => void
  ): void
  on<E extends DataManagerEventName>(
    eventName: E,
    handler: (data: any) => void
  ): void {
    {
      switch (eventName) {
        case 'handshake':
          this.handshakeEventHandlers.push(handler)
          break
        case 'playerSnapshot':
          this.playerSnapShotEventHandlers.push(handler)
          break
      }
    }
  }

  static extractSnapshot(player: Player): PlayerSnapshotDatatype {
    /** https://stackoverflow.com/questions/17781472/how-to-get-a-subset-of-a-javascript-objects-properties */
    return (({
      keyInfo,
      x,
      y,
      body: {
        velocity: { x: xVelocity, y: yVelocity },
      },
    }) => ({
      type: 'playerSnapshot',
      keyInfo,
      x,
      y,
      xVelocity,
      yVelocity,
    }))(player)
  }

  static isHandShakeDatatype(datatype: any): datatype is HandshakeDatatype {
    return 'type' in datatype && datatype.type === 'handshake'
  }
  static isPlayerSnapshotDatatype(
    datatype: any
  ): datatype is PlayerSnapshotDatatype {
    return 'type' in datatype && datatype.type === 'playerSnapshot'
  }
}
