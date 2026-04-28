import { create } from 'zustand'
import type { Settings } from '@/types'

interface SettingsStore {
  settings: Settings | null
  darkMode: boolean
  setSettings: (settings: Settings) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  darkMode: localStorage.getItem('darkMode') === 'true',

  setSettings: (settings) => set({ settings }),

  toggleDarkMode: () => {
    const newMode = !get().darkMode
    localStorage.setItem('darkMode', String(newMode))
    document.documentElement.classList.toggle('dark', newMode)
    set({ darkMode: newMode })
  },

  setDarkMode: (dark) => {
    localStorage.setItem('darkMode', String(dark))
    document.documentElement.classList.toggle('dark', dark)
    set({ darkMode: dark })
  },
}))
