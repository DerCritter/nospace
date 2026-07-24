import { create } from 'zustand'

export const useStore = create((set) => ({
  activeArt: null,
  setActiveArt: (artData) => set({ activeArt: artData }),
  
  // Multiplayer State
  players: {},
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((state) => ({ players: { ...state.players, [player.id]: player } })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players }
    delete newPlayers[id]
    return { players: newPlayers }
  }),
  updatePlayer: (playerData) => set((state) => {
    if (!state.players[playerData.id]) return state
    return {
      players: {
        ...state.players,
        [playerData.id]: {
          ...state.players[playerData.id],
          ...playerData
        }
      }
    }
  })
}))
