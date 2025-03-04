// import { Peer } from 'peerjs'

// export async function joinPeerServer() {
//   const peer = new Peer({ host: '127.0.0.1', port: 41361, path: '/' })
//   let idLocal = ''
//   peer.on('open', function (id) {
//     console.log('My peer ID is: ' + id)
//     idLocal = id
//     //   const otherPeerClientId = window.prompt('Please enter a peer id...')
//   })

//   peer.on('connection', (connWeReceived) => {
//     console.log('connection FROM remote peer')
//     connWeReceived.on('data', function (data) {
//       console.log('Received', data)
//     })

//     connWeReceived.on('open', () => {
//       connWeReceived.send(`Hello from what you connected to  ${idLocal}`)
//       window.send = (message: any) => connWeReceived.send(message)
//     })
//   })

//   // function connectAndTalk(id: string) {
//   //   const otherPeerClientId = id

//   //   if (otherPeerClientId) {
//   //     const connWeInitiated = peer.connect(otherPeerClientId)
//   //     connWeInitiated.on('data', function (data) {
//   //       console.log('Received', data)
//   //     })
//   //     window.send = (message: any) => connWeInitiated.send(message)
//   //   } else {
//   //     throw new Error("Peer id can't be empty")
//   //   }
//   // }
// }

// // export { peer, connectAndTalk }

import Peer, { DataConnection } from 'peerjs'

export async function getPeerIdsAsync() {
  const res = await fetch('http://127.0.0.1:41362')

  const parsedObject = (await res.json()) as { currentClientIds: string[] }

  return parsedObject.currentClientIds
}

export function registerWithPeerServerAsync() {
  const peerMe = new Peer({
    host: '127.0.0.1',
    port: 41361,
    path: '/',
  })

  const peerPromise = new Promise<Peer>((resolve, reject) => {
    try {
      peerMe.on('open', (id) => {
        console.log('My Peer ID is: ' + id)
        resolve(peerMe)
      })
    } catch (error) {
      reject(error)
    }
  })



  return peerPromise
}

export function connectToPeer(peerMe: Peer) {
  const targetPeerInput = document.getElementById(
    'targetPeer'
  ) as HTMLInputElement
  const conn = peerMe.connect(targetPeerInput.value)
  conn.on('open', function () {
    console.log('connection opened to peer')
    // Receive messages
  })

  conn.on('data', function (data) {
    console.log('Received', data)
  })

  return conn
}

export function talk(conn: DataConnection) {
  conn.send('Hello!' + crypto.randomUUID())
}
