import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useBotStore } from '@/store/botStore'
import type { CapitalState, RiskStatus, BotStatus } from '@/types'

export function useCapital() {
  return useQuery<CapitalState>({
    queryKey: ['capital'],
    queryFn: async () => (await api.get('/dashboard/capital')).data,
  })
}

export function useRiskStatus() {
  return useQuery<RiskStatus>({
    queryKey: ['risk'],
    queryFn: async () => (await api.get('/dashboard/risk')).data,
  })
}

export function useBotStatus() {
  const setBotStatus = useBotStore((s) => s.setBotStatus)

  return useQuery<BotStatus>({
    queryKey: ['botStatus'],
    queryFn: async () => {
      const data = (await api.get('/dashboard/bot-status')).data
      setBotStatus(data)
      return data
    },
  })
}

export function useStartBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/dashboard/bot/start'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botStatus'] })
    },
  })
}

export function useStopBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/dashboard/bot/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botStatus'] })
    },
  })
}

export function useCryptoPrices() {
  return useQuery({
    queryKey: ['cryptoPrices'],
    queryFn: async () => (await api.get('/dashboard/prices')).data,
    refetchInterval: 10000,
  })
}

export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => (await api.get('/dashboard/markets')).data,
    refetchInterval: 30000,
  })
}
