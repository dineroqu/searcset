import Card from '@/components/ui/Card'
import { useCapital } from '@/hooks/useBot'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Settings } from '@/types'

export default function DailyProgress() {
  const { data: capital } = useCapital()
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/')).data,
  })

  const progress = capital?.target_progress ?? 0
  const daysRemaining = settings?.trading_duration_days ?? 30

  return (
    <Card>
      <div className="space-y-4">
        {/* Daily target */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-sans text-gray-500 dark:text-gray-400">Target Harian</span>
            <span className="text-sm font-mono font-medium">
              {formatCurrency(capital?.today_pnl ?? 0)} / {formatCurrency(capital?.daily_target ?? 5)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral to-coral-dark rounded-full transition-all duration-1000 animate-progress"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 font-mono">{progress.toFixed(1)}% tercapai</p>
        </div>

        {/* Duration */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-sans text-gray-500 dark:text-gray-400">Durasi Trading</span>
            <span className="text-sm font-mono font-medium">{daysRemaining} hari tersisa</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, 100 - (daysRemaining / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
