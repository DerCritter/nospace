import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store players state in memory
const players = {}

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`)

  // Create initial player state
  players[socket.id] = {
    id: socket.id,
    position: [0, 1.6, 0],
    rotation: [0, 0, 0] // [pitch, yaw, roll]
  }

  // Tell the new client about all existing players (including themselves)
  socket.emit('playersState', players)

  // Tell everyone else about the new player
  socket.broadcast.emit('playerJoined', players[socket.id])

  // Handle movement updates from clients
  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      // Update server state
      players[socket.id].position = data.position
      players[socket.id].rotation = data.rotation

      // Broadcast the movement to ALL OTHER clients
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: data.position,
        rotation: data.rotation
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`)
    delete players[socket.id]
    // Tell everyone else to remove this player
    io.emit('playerLeft', socket.id)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`🚀 Multiplayer Server running on ws://localhost:${PORT}`)
})
