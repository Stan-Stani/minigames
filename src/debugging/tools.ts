export function stickyMessage(...messages: any) {
  // console.log(message)
  const prettyMessages: string[] = []
  let identifier

  identifier = getStackIdentifier()
  for (const message of messages) {
    if (message === undefined || message === null) {
      throw new Error('Current message is ' + message)
    }
    if (message.hasOwnProperty('_id')) {
      identifier = message._id
      continue
    }

    prettyMessages.push(
      typeof message === 'string' || typeof message === 'number'
        ? String(message)
        : JSON.stringify(message)
    )
  }

  if (!stackToDivMap[identifier]) {
    console.log('s')
    // Create a new div for this identifier
    let newDiv = document.createElement('div')
    newDiv.textContent = prettyMessages.join(' ')
    const logDiv = document.getElementById('log')
    const messageDiv = logDiv!.appendChild(newDiv)
    messageDiv.classList.add('log-message', 'fade-in')
    stackToDivMap[identifier] = newDiv
  } else {
    // Update the existing div
    stackToDivMap[identifier].textContent = prettyMessages.join(' ')
  }
}

export function clearStickyMessage() {
  const stickyMessage = document.getElementById('sticky-message')
  if (stickyMessage) {
    stickyMessage.innerHTML = ''
  }
}

export function toastMessage(message: any) {
  console.log(message)
  const prettyMessage =
    typeof message === 'string' || typeof message === 'number'
      ? String(message)
      : JSON.stringify(message)
  const logDiv = document.getElementById('log')
  const messageDiv = document.createElement('div')
  messageDiv.classList.add('log-message', 'fade-in')
  logDiv?.appendChild(messageDiv)
  messageDiv?.append(prettyMessage)
  setTimeout(() => {
    messageDiv.classList.add('fade-out')
    setTimeout(() => messageDiv.remove(), 2000)
  }, 7000)
}

interface IDictionary {
  [index: string]: HTMLElement
}
let stackToDivMap: IDictionary = {}

function getStackIdentifier() {
  let stack = new Error().stack
  if (stack) {
    let stackLines = stack.split('\n')
    // Use a combination of function name and line number as the identifier
    // Adjust the index based on where the relevant information is in your stack trace
    return stackLines[2] + stackLines[3]
  }
  return ''
}
