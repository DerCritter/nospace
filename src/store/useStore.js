import { create } from 'zustand'

export const useStore = create((set) => ({
  activeArt: null,
  setActiveArt: (artData) => set({ activeArt: artData }),
}))
