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

  openedConnections: DataConnection[] = []
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
      host: '192.168.86.139',
      port: 41361,
      path: '/',
    })
    this.peerMe = peerMe

    peerMe.on('open', (id) => {
      console.log('My Peer ID is: ' + id)
    })

    if (!peerMe) {
      throw new Error(`peerMe is ${peerMe}.`)
    }
    let peerIdsNotMe: string[] = []

    peerMe.on('connection', (connIn) => {
      connIn.on('open', () => {
        this.openedConnections.push(connIn)
        this.#onConnOpenHandlers.forEach((h) => h(connIn, 'them'))
      })
    })

    peerMe.listAllPeers((peerIds) => {
      peerIdsNotMe = peerIds.filter((id) => id !== peerMe)

      if (peerIdsNotMe.length) {
        peerIdsNotMe.forEach((id, index, arr) => {
          const connOut = peerMe.connect(id)

          // Peer Server waits 5 minutes to remove peers from its list
          // so some likely are no longer active players. Best I can do
          // is try to handshake with all peers, then wait 5 seconds
          // and assume I've got all active players.
          connOut?.on('open', () => {
            this.openedConnections.push(connOut)

            console.log(`Connected to Peer (${id}).`)
            this.#onConnOpenHandlers.forEach((h) => h(connOut, 'me'))
          })

          if (index === arr.length - 1) {
            setTimeout(() => {
              this.#delayForConnectionsToOpenPromiseResolveFunc('shouldBeReady')
            }, 5000)
          }
        })
      } else {
        this.#delayForConnectionsToOpenPromiseResolveFunc('shouldBeReady')
      }
    })
  }

  announce<T>(data: T) {
    this.openedConnections.forEach((conn) => conn.send(data))
  }

  shouldBeReadyAsync() {
    return this.#delayForConnectionsToOpenPromise
  }
}
