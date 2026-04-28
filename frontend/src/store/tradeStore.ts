import { create } from 'zustand'
import type { Trade, TradeSummary } from '@/types'

interface TradeStore {
  recentTrades: Trade[]
  activePositions: Trade[]
  summary: TradeSummary | null
  setRecentTrades: (trades: Trade[]) => void
  setActivePositions: (positions: Trade[]) => void
  setSummary: (summary: TradeSummary) => void
}

export const useTradeStore = create<TradeStore>((set) => ({
  recentTrades: [],
  activePositions: [],
  summary: null,
  setRecentTrades: (trades) => set({ recentTrades: trades }),
  setActivePositions: (positions) => set({ activePositions: positions }),
  setSummary: (summary) => set({ summary }),
}))
