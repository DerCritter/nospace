import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useStore } from '../store/useStore'

// Export global socket instance so Player.jsx can emit updates
export let socket = null

export default function NetworkManager() {
  const setPlayers = useStore((state) => state.setPlayers)
  const addPlayer = useStore((state) => state.addPlayer)
  const removePlayer = useStore((state) => state.removePlayer)
  const updatePlayer = useStore((state) => state.updatePlayer)

  useEffect(() => {
    // Determinar la URL del servidor automáticamente. 
    // En local usará el puerto 3001. En producción (Vercel) usará la URL de tu servidor (Render, Railway, etc).
    const serverUrl = import.meta.env.VITE_SERVER_URL || 
                      (import.meta.env.DEV ? 'http://localhost:3001' : 'https://tu-futuro-servidor.onrender.com')
                      
    socket = io(serverUrl)

    socket.on('connect', () => {
      console.log('Connected to multiplayer server with ID:', socket.id)
    })

    socket.on('playersState', (playersObj) => {
      // Don't render our own avatar locally
      const remotePlayers = { ...playersObj }
      delete remotePlayers[socket.id]
      setPlayers(remotePlayers)
    })

    socket.on('playerJoined', (player) => {
      if (player.id !== socket.id) {
        addPlayer(player)
      }
    })

    socket.on('playerLeft', (id) => {
      removePlayer(id)
    })

    socket.on('playerMoved', (playerData) => {
      updatePlayer(playerData)
    })

    return () => {
      socket.disconnect()
      socket = null
    }
  }, [setPlayers, addPlayer, removePlayer, updatePlayer])

  return null
}
