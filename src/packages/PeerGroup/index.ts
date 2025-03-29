import Peer, { DataConnection } from 'peerjs'

export class PeerGroup {
  peerMe: Peer | undefined
  #onConnOpenHandlers: ((
    conn: DataConnection,
    openedBy: 'them' | 'me'
  ) => void)[] = []

  onConnOpen(handler: (conn: DataConnection, openedBy: 'them' | 'me') => void) {
    this.#onConnOpenHandlers.push(handler)
  }

  constructor(
    onConnOpen: (conn: DataConnection, openedBy: 'them' | 'me') => void
  ) {
    this.onConnOpen(onConnOpen)
    this.#openConnections()

    // TS doesn't recognize that the promise executor callback runs
    // synchronously so we have to mock the resolver here first so it's
    // "definitely" defined in the constructor.
    this.#delayForConnectionsToOpenPromiseResolveFunc = (
      value: 'shouldBeReady' | PromiseLike<'shouldBeReady'>
    ) => undefined
    this.#delayForConnectionsToOpenPromise = new Promise<'shouldBeReady'>(
      (resolve, _reject) => {
        this.#delayForConnectionsToOpenPromiseResolveFunc = resolve
      }
    )
  }

  liveConnections: Map<DataConnection, DataConnection> = new Map()
  #delayForConnectionsToOpenPromiseResolveFunc: (
    value: 'shouldBeReady' | PromiseLike<'shouldBeReady'>
  ) => void
  #delayForConnectionsToOpenPromise: Promise<'shouldBeReady'>

  /** Try to connect to all peers currently registered on the Peer Server.
   * @returns `Promise<PeerGroup>` resolving to the same peer group
   * 5 seconds after has tried to open connections with all peer
   */
  #openConnections(this: PeerGroup) {
    const peerMe = new Peer({
      host: import.meta.env.VITE_PEER_SERVER_HOST,
      port: 41361,
      path: '/',
      debug: 1,
      secure: true,
    })
    this.peerMe = peerMe
    peerMe.on('error', (error) => console.error(error))
    peerMe.on('close', () => console.log('Connection closed'))
    peerMe.on('disconnected', () => console.log('Disconnected'))

    peerMe.on('open', (id) => {
      console.log('My Peer ID is: ' + id)

      if (!peerMe) {
        throw new Error(`peerMe is ${peerMe}.`)
      }
      let peerIdsNotMe: string[] = []

      peerMe.on('connection', (connIn) => {
        console.log('connIn from', connIn.peer)
        connIn.on('open', () => {
          console.log('connIn OPEN!')
          this.liveConnections.set(connIn, connIn)
          this.#onConnOpenHandlers.forEach((h) => h(connIn, 'them'))
        })

        connIn.on('close', () => {
          this.liveConnections.delete(connIn)
        })
      })

      peerMe.listAllPeers((peerIds) => {
        peerIdsNotMe = peerIds.filter((id) => id !== peerMe.id)

        if (peerIdsNotMe.length) {
          peerIdsNotMe.forEach((id, index, arr) => {
            const connOut = peerMe.connect(id)

            // Peer Server waits 5 minutes to remove peers from its list
            // so some likely are no longer active players. Best I can do
            // is try to handshake with all peers, then wait 5 seconds
            // and assume I've got all active players.
            console.log('wiating to open to ', id)
            connOut.on('iceStateChanged', console.log)
            connOut?.on('error', console.log)
            connOut?.on('open', () => {
              this.liveConnections.set(connOut, connOut)

              console.log(`Connected to Peer (${id}).`)
              this.#onConnOpenHandlers.forEach((h) => h(connOut, 'me'))
            })

            connOut.on('close', () => {
              this.liveConnections.delete(connOut)
            })

            if (index === arr.length - 1) {
              setTimeout(() => {
                this.#delayForConnectionsToOpenPromiseResolveFunc(
                  'shouldBeReady'
                )
              }, 5000)
            }
          })
        } else {
          this.#delayForConnectionsToOpenPromiseResolveFunc('shouldBeReady')
        }
      })
    })
  }

  announce<T>(data: T) {
    this.liveConnections.forEach((conn) => conn.send(data))
  }

  shouldBeReadyAsync() {
    return this.#delayForConnectionsToOpenPromise
  }
}
