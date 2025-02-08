import { Peer } from 'peerjs'

export async function getPeersAsync() {
  const res = await fetch('http://127.0.0.1:41362')
  console.log({ res })

  const parsedObject = await res.json()
  console.log({ parsedObject })
}

export async function joinPeerServer() {
  const peer = new Peer({ host: '127.0.0.1', port: 41361, path: '/' })
  let idLocal = ''
  peer.on('open', function (id) {
    console.log('My peer ID is: ' + id)
    idLocal = id
    //   const otherPeerClientId = window.prompt('Please enter a peer id...')
  })

  peer.on('connection', (connWeReceived) => {
    console.log('connection FROM remote peer')
    connWeReceived.on('data', function (data) {
      console.log('Received', data)
    })

    connWeReceived.on('open', () => {
      connWeReceived.send(`Hello from what you connected to  ${idLocal}`)
      window.send = (message: any) => connWeReceived.send(message)
    })
  })

  // function connectAndTalk(id: string) {
  //   const otherPeerClientId = id

  //   if (otherPeerClientId) {
  //     const connWeInitiated = peer.connect(otherPeerClientId)
  //     connWeInitiated.on('data', function (data) {
  //       console.log('Received', data)
  //     })
  //     window.send = (message: any) => connWeInitiated.send(message)
  //   } else {
  //     throw new Error("Peer id can't be empty")
  //   }
  // }
}

// export { peer, connectAndTalk }
