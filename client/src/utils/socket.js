import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) {
    return socket
  }

  socket = io({
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  })

  socket.on('connect', () => {
    console.log('Socket connected')
    socket.emit('join:groups')
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket() {
  return socket
}
