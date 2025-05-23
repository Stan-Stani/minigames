import { DataConnection } from 'peerjs'
import { InitInfo } from './InitInfo'

interface HasInitInfo {
  initInfo: InitInfo
}

/** D for Duck, as in Duck Typing. Basically IPlayerSession but
 * with a more semantic name. A POJO that captures the essence of a
 * {@link PlayerSession}.
 */
export interface DPlayerSession extends HasInitInfo {
  connection: DataConnection
  initInfo: InitInfo
}

export class PlayerSession implements DPlayerSession {
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