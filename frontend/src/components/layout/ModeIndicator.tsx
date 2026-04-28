import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Settings } from '@/types'

export default function ModeIndicator() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/')).data,
  })

  const isTestnet = settings?.mode !== 'mainnet'

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider ${
        isTestnet
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700'
          : 'bg-green-100 text-success dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-red-500 animate-pulse' : 'bg-success'}`} />
      {isTestnet ? 'TESTNET' : 'MAINNET LIVE'}
    </div>
  )
}
