import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_TRANSITION, type TransitionId } from '@/constants/transitions'

/** Jogos com sala multiplayer (reconexão pela última sala). */
export type RoomGame = 'impostor' | 'time' | 'campo-minado' | 'reflexo' | 'provavel' | 'ordem'

type Settings = {
  allowRepeats: boolean
  countdownEnabled: boolean
  countdownSeconds: number
  weightMin: number
  weightMax: number
  weightUnit: 'g' | 'kg'
  numberDigits: number
  passwordCount: number
}

type PlayerProfile = {
  name: string
  avatar: string
}

type GameState = {
  soundEnabled: boolean
  transition: TransitionId
  settings: Settings
  profile: PlayerProfile
  customAvatars: string[]
  usedMegaPasswordWords: string[]
  lastRoomID: string | null
  lastGameType: RoomGame | null
  setSoundEnabled: (enabled: boolean) => void
  setTransition: (transition: TransitionId) => void
  updateProfile: (profile: Partial<PlayerProfile>) => void
  addCustomAvatar: (avatar: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  markMegaPasswordWordsAsUsed: (words: string[]) => void
  resetMegaPasswordHistory: () => void
  resetSettings: () => void
  setLastRoom: (roomID: string | null, gameType: RoomGame | null) => void
}

export const defaultSettings: Settings = {
  allowRepeats: false,
  countdownEnabled: true,
  countdownSeconds: 10,
  weightMin: 10,
  weightMax: 5000,
  weightUnit: 'g',
  numberDigits: 4,
  passwordCount: 5
}

export const defaultProfile: PlayerProfile = {
  name: '',
  avatar: '🐺'
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      transition: DEFAULT_TRANSITION,
      settings: defaultSettings,
      profile: defaultProfile,
      customAvatars: [],
      usedMegaPasswordWords: [],
      lastRoomID: null,
      lastGameType: null,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setTransition: (transition) => set({ transition }),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      addCustomAvatar: (avatar) => set((state) => ({ customAvatars: [...new Set([...state.customAvatars, avatar])].slice(-24) })),
      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      markMegaPasswordWordsAsUsed: (words) => set((state) => ({
        usedMegaPasswordWords: [...new Set([...state.usedMegaPasswordWords, ...words])]
      })),
      resetMegaPasswordHistory: () => set({ usedMegaPasswordWords: [] }),
      resetSettings: () => set({ settings: defaultSettings }),
      setLastRoom: (lastRoomID, lastGameType) => set({ lastRoomID, lastGameType })
    }),
    {
      name: 'alcateia-games',
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        transition: state.transition,
        settings: state.settings,
        profile: state.profile,
        customAvatars: state.customAvatars,
        usedMegaPasswordWords: state.usedMegaPasswordWords,
        lastRoomID: state.lastRoomID,
        lastGameType: state.lastGameType
      })
    }
  )
)
