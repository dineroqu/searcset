import { create } from 'zustand'
import type { BotStatus, CryptoPrices } from '@/types'

interface BotStore {
  botStatus: BotStatus
  cryptoPrices: CryptoPrices
  setBotStatus: (status: BotStatus) => void
  setCryptoPrices: (prices: CryptoPrices) => void
}

export const useBotStore = create<BotStore>((set) => ({
  botStatus: {
    status: 'idle',
    is_running: false,
    is_stopping: false,
    open_positions: 0,
  },
  cryptoPrices: {
    btcusdt: { price: 0, change_24h: 0 },
    ethusdt: { price: 0, change_24h: 0 },
  },
  setBotStatus: (status) => set({ botStatus: status }),
  setCryptoPrices: (prices) => set({ cryptoPrices: prices }),
}))
