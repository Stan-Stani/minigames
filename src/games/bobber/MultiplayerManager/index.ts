import Peer, { DataConnection } from 'peerjs'
import { PlayerSession } from './PlayerSession'
import { Tinter } from './Tinter'
import { PeerGroup } from '../../../packages/PeerGroup'
import {
  DataManager,
  HandshakeDatatype,
  PlayerSnapshotDatatype,
} from './DataManager'
import { InitInfo } from './PlayerSession/InitInfo'

export interface PlayerSessionsContainer {
  /** key is peer Id of DataConnection */
  active: Map<string, PlayerSession>
  /** key is peer Id of DataConnection */
  failed: Map<string, PlayerSession>
}

/**
 * @todo
 * When I add more games, I'll need a custom init function for
 * each type of game if it has multiplayer, a way to manage and only talk to
 * peers that are in the same game, and if it doesn't have multiplayer
 * I probably want to just kill the multiplayer manager or
 * close all connections until I return
 * to the menu scene. It'd be a lot simpler if I wasn't trying to 
 * setup multiplayer connections in the menu scene.
 */
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

  static instantiationCount = 0

  dataManager: DataManager | null = null
  constructor() {
    if (MultiplayerManager.instantiationCount > 0) {
      debugger
      throw new Error('More than one instantiation of MultiplayerManager.')
    }
    console.count('Multiplayer Manager instantiation begun')
    MultiplayerManager.instantiationCount++
    this.peerGroup = new PeerGroup((conn, _openedBy) => {
      const sess = new PlayerSession(conn, new InitInfo())
      console.log('Adding remote to active!', conn.peer)
      this.playerSessionsContainer.active.set(conn.peer, sess)
      /** @todo call callbacks that depend on our playerSessionsContainer
       * (basically our connections) to be populated
       * Or return a promise?
       */
      console.log('adding peer', conn.peer)
      console.log(
        'active peers from multiplayer manager',
        this.playerSessionsContainer.active
      )

      conn.on('close', () => {
        this.playerSessionsContainer.active.delete(conn.peer)
        this.playerSessionsContainer.failed.set(conn.peer, sess)
      })

      const dataManager = new DataManager(conn)
      this.dataManager = dataManager
      this.sendHandshake(sess)
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

      dataManager.on('playerSnapshot', (snapshot) => {
        console.log({ snapshot })
      })
    })

    this.meNode.peerMe = this.peerGroup.peerMe

    this.peerGroup
      .shouldBeReadyAsync()
      .then(() => {
        this.establishTint()
      })
      .catch((error) => {
        throw error
      })
  }

  announceSnapshot(snapshot: PlayerSnapshotDatatype) {
    this.peerGroup.announce(snapshot)
  }

  sendHandshake(sess: PlayerSession) {
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
      console.log({ colorlessIncludingMe })
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
