import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useTradeStore } from '@/store/tradeStore'
import type { Trade, TradeSummary } from '@/types'

export function useRecentTrades(limit = 10) {
  const setRecentTrades = useTradeStore((s) => s.setRecentTrades)

  return useQuery<Trade[]>({
    queryKey: ['recentTrades', limit],
    queryFn: async () => {
      const data = (await api.get(`/trades/recent?limit=${limit}`)).data
      setRecentTrades(data)
      return data
    },
  })
}

export function useActivePositions() {
  const setActivePositions = useTradeStore((s) => s.setActivePositions)

  return useQuery<Trade[]>({
    queryKey: ['activePositions'],
    queryFn: async () => {
      const data = (await api.get('/trades/active')).data
      setActivePositions(data)
      return data
    },
  })
}

export function useTradeSummary() {
  const setSummary = useTradeStore((s) => s.setSummary)

  return useQuery<TradeSummary>({
    queryKey: ['tradeSummary'],
    queryFn: async () => {
      const data = (await api.get('/trades/summary')).data
      setSummary(data)
      return data
    },
  })
}
