import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useRecentTrades } from '@/hooks/useRealtime'
import { formatCurrency, formatPnl, timeAgo } from '@/lib/utils'

export default function RecentTrades() {
  const { data: trades } = useRecentTrades()
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all')

  const filtered = trades?.filter((t) => {
    if (filter === 'win') return (t.pnl ?? 0) > 0
    if (filter === 'loss') return (t.pnl ?? 0) < 0
    return true
  })

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-border dark:border-border-dark flex items-center justify-between">
        <h3 className="font-sans font-semibold text-sm">Trade Terbaru</h3>
        <div className="flex gap-1">
          {(['all', 'win', 'loss'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'primary' : 'ghost'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Semua' : f === 'win' ? 'Win' : 'Loss'}
            </Button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border dark:divide-border-dark">
        {filtered && filtered.length > 0 ? (
          filtered.map((trade) => (
            <div key={trade.id} className="px-4 py-3 flex items-center gap-3 hover:bg-surface dark:hover:bg-[#2a2a2a]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                (trade.pnl ?? 0) >= 0
                  ? 'bg-green-100 text-success dark:bg-green-900/30'
                  : 'bg-red-100 text-red-500 dark:bg-red-900/30'
              }`}>
                {(trade.pnl ?? 0) >= 0 ? 'W' : 'L'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-sans truncate">{trade.market_question}</p>
                <p className="text-[10px] text-gray-400 font-mono">
                  {trade.opened_at ? timeAgo(trade.opened_at) : ''} · {trade.side} · {formatCurrency(trade.size)}
                </p>
              </div>

              <div className="text-right">
                <p className={`text-sm font-mono font-bold ${
                  (trade.pnl ?? 0) >= 0 ? 'text-success' : 'text-red-500'
                }`}>
                  {formatPnl(trade.pnl ?? 0)}
                </p>
                <Badge variant={trade.side === 'YES' ? 'success' : 'danger'} className="mt-0.5">
                  {trade.ai_provider || 'N/A'}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Belum ada trade
          </div>
        )}
      </div>
    </Card>
  )
}
