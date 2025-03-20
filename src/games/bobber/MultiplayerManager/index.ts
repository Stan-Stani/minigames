import Peer, { DataConnection } from 'peerjs'
import { PlayerSession } from './PlayerSession'
import { Tinter } from './Tinter'
import { PeerGroup } from '../../../packages/PeerGroup'
import { DataManager, HandshakeDatatype } from './DataManager'
import { InitInfo } from './PlayerSession/InitInfo'

export interface PlayerSessionsContainer {
  /** key is peer Id of DataConnection */
  active: Map<string, PlayerSession>
  /** key is peer Id of DataConnection */
  failed: Map<string, PlayerSession>
}

export class MultiplayerManager {
  /** Represents the "Peer"/Player that lives on this device.  */
  meNode: {
    peerMe: Peer | undefined
    initInfo: InitInfo
    state: null | {
      type: 'wait_for_tint_turn'
      ascendingColorlessByJoinTime: [string, PlayerSession][]
    }
  } = { peerMe: undefined, initInfo: new InitInfo(Date.now()), state: null }

  tinter = new Tinter()
  peerGroup: PeerGroup

  playerSessionsContainer: PlayerSessionsContainer = {
    active: new Map<string, PlayerSession>(),
    failed: new Map<string, PlayerSession>(),
  }

  constructor() {
    this.peerGroup = new PeerGroup((conn, _openedBy) => {
      const sess = new PlayerSession(conn, new InitInfo())
      this.playerSessionsContainer.active.set(conn.peer, sess)

      conn.on('close', () => {
        this.playerSessionsContainer.active.delete(conn.peer)
        this.playerSessionsContainer.failed.set(conn.peer, sess)
      })

      const dataManager = new DataManager(conn)
      this.doHandshake(sess)
      dataManager.on('handshake', (data) => {
        const sess = this.playerSessionsContainer.active.get(conn.peer)
        if (!sess) {
          throw new Error(`Sess is ${sess}.`)
        }
        sess.initInfo = data.initInfo

        if (sess.initInfo.tint) {
          this.tinter.consumeTint(sess.initInfo.tint)
        }

        if (this.meNode.state?.type === 'wait_for_tint_turn') {
          console.log('hey')
          const indexWhoAnnouncedColor =
            this.meNode.state.ascendingColorlessByJoinTime.findIndex(
              ([id, _sess]) => {
                conn.peer === id
              }
            )

          const myIndex =
            this.meNode.state.ascendingColorlessByJoinTime.findIndex(
              ([id, _sess]) => {
                this.meNode.peerMe?.id === id
              }
            )

          if (indexWhoAnnouncedColor === myIndex - 1) {
            this.meNode.initInfo.tint = this.tinter.decideMyTint()
            const data: HandshakeDatatype = {
              type: 'handshake',
              initInfo: this.meNode.initInfo,
            }
            console.log('i announce my color after waiting. I am ', myIndex)
            this.peerGroup.announce(data)
          }
        }
      })
    })

    this.meNode.peerMe = this.peerGroup.peerMe

    this.peerGroup.shouldBeReadyAsync().then(() => {
      this.establishTint()
    })
  }

  doHandshake(sess: PlayerSession) {
    console.log('I send handshake', this.meNode.initInfo.tint)
    const data: HandshakeDatatype = {
      type: 'handshake',
      initInfo: this.meNode.initInfo,
    }
    sess.connection.send(data)
  }

  establishTint = () => {
    const peerMe = this.meNode.peerMe
    if (!peerMe) {
      throw new Error(`peerMe is ${peerMe}.`)
    }

    const activePlayerSessions = this.playerSessionsContainer.active
    console.log({ activePlayerSessions })
    if (this.playerSessionsContainer.active.size >= this.tinter.tints.length) {
      /** @todo */
      // just pick and broadcast a random color
      debugger
    } else {
      const colorlessSessions = [...activePlayerSessions].filter(
        ([_id, sess]) => sess.initInfo.tint === null
      )
      colorlessSessions.push([
        peerMe.id,
        new PlayerSession({} as DataConnection, this.meNode.initInfo),
      ])
      const colorlessIncludingMe = colorlessSessions
      const ascendingColorlessByJoinTime = colorlessIncludingMe.sort(
        ([_keyA, valueA], [_keyB, valueB]) => {
          if (
            valueA.initInfo.timestamp === null ||
            valueB.initInfo.timestamp === null
          ) {
            debugger
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
      if (ascendingColorlessByJoinTime[0][0] === peerMe.id) {
        console.log('BINGO')
        this.meNode.initInfo.tint = this.tinter.decideMyTint()
        const data: HandshakeDatatype = {
          type: 'handshake',
          initInfo: this.meNode.initInfo,
        }
        console.log('me first')
        this.peerGroup.announce(data)
      } else {
        console.log('WAIT')
        this.meNode.state = {
          type: 'wait_for_tint_turn',
          ascendingColorlessByJoinTime,
        }
      }
    }
  }
}
