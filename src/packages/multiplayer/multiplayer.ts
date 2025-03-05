import Peer, { DataConnection } from 'peerjs'

export class PeerGroup {
  peerMe: Peer | undefined
  connections: DataConnection[] = []

  constructor() {}

  /** Returned promise resolves with the same peerGroup after
   *  peerMe connects to the Peer Server */
  registerWithPeerServerAsync(this: PeerGroup) {
    this.peerMe = new Peer({
      host: '127.0.0.1',
      port: 41361,
      path: '/',
    })

    this.peerMe.on('connection', (connIn) => {
      this.connections.push(connIn)
      console.log(`Peer (${connIn.peer}) connected.`)
      connIn.on('data', function (data) {
        console.log(`Peer (${connIn.peer}) sent: `, data)
      })
    })

    const peerGroupPromise = new Promise<typeof this>((resolve, reject) => {
      try {
        this.peerMe?.on('open', (id) => {
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
   * @returns `Promise<PeerGroup>` resolving to the same peer group.
   */
  openConnectionsAsync(this: PeerGroup) {
    if (!this.peerMe) {
      throw new Error(`this.peerMe is ${this.peerMe}.`)
    }
    let peerIdsNotMe: string[] = []

    const peerGroupPromise = new Promise<PeerGroup>(
      (resolve, reject) =>
        this.peerMe?.listAllPeers((peerIds) => {
          peerIdsNotMe = peerIds.filter((id) => id !== this.peerMe?.id)
          peerIdsNotMe.forEach((id) => {
            const connOut = this.peerMe?.connect(id)
            connOut && this.connections.push(connOut)
            try {
              connOut?.on('open', () => {
                console.log(`Connected to Peer (${id}).`)
              })
              connOut?.on('data', (data) => {
                console.log(`Peer (${id}) sent `, data)
              })
            } catch (error) {
              console.error(error)
              reject(error)
            }
          })
          resolve(this)
        })
    )

    return peerGroupPromise
  }

  announce<T>(data: T) {
    this.connections.forEach((conn) => conn.send(data))
  }
}
