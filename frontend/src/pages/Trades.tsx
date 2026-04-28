import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import api from '@/lib/api'
import { formatCurrency, formatPnl, timeAgo } from '@/lib/utils'
import type { Trade, TradeSummary } from '@/types'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Trades() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: summary } = useQuery<TradeSummary>({
    queryKey: ['tradeSummary'],
    queryFn: async () => (await api.get('/trades/summary')).data,
  })

  const { data: tradesData } = useQuery<{
    trades: Trade[]
    total: number
    page: number
    total_pages: number
  }>({
    queryKey: ['trades', page, filter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (filter) params.set('status', filter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      return (await api.get(`/trades/?${params}`)).data
    },
  })

  const handleExportCSV = () => {
    const trades = tradesData?.trades || []
    const headers = 'Waktu,Market,Side,Size,Entry,Exit,P&L,Status,AI Provider'
    const rows = trades.map(
      (t) =>
        `${t.opened_at},${t.market_question},${t.side},${t.size},${t.entry_price},${t.exit_price ?? ''},${t.pnl ?? ''},${t.status},${t.ai_provider ?? ''}`
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trades.csv'
    a.click()
  }

  const stats = [
    { label: 'Win Rate', value: `${summary?.win_rate ?? 0}%` },
    { label: 'Total Trades', value: String(summary?.total_trades ?? 0) },
    { label: 'Best Trade', value: formatPnl(summary?.best_trade ?? 0) },
    { label: 'Worst Trade', value: formatPnl(summary?.worst_trade ?? 0) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-sans font-bold">Trades</h1>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="text-xs text-gray-400 font-sans">{stat.label}</p>
            <p className="text-lg font-mono font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Status</label>
            <select
              value={filter || ''}
              onChange={(e) => { setFilter(e.target.value || undefined); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-[#1A1A1A] text-sm"
            >
              <option value="">Semua</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Dari</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Sampai</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono border-b border-border dark:border-border-dark">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">P&L</th>
                <th className="px-4 py-3">AI</th>
              </tr>
            </thead>
            <tbody>
              {tradesData?.trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-t border-border dark:border-border-dark hover:bg-surface dark:hover:bg-[#2a2a2a]"
                >
                  <td className="px-4 py-3">
                    <span className={`text-lg ${(trade.pnl ?? 0) >= 0 ? 'text-success' : 'text-red-500'}`}>
                      {(trade.pnl ?? 0) >= 0 ? 'W' : 'L'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {trade.opened_at ? timeAgo(trade.opened_at) : '-'}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs max-w-[200px] truncate">
                    {trade.market_question}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={trade.side === 'YES' ? 'success' : 'danger'}>
                      {trade.side}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(trade.size)}</td>
                  <td className="px-4 py-3 font-mono">${trade.entry_price.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono">
                    {trade.exit_price ? `$${trade.exit_price.toFixed(4)}` : '-'}
                  </td>
                  <td className={`px-4 py-3 font-mono font-bold ${
                    (trade.pnl ?? 0) >= 0 ? 'text-success' : 'text-red-500'
                  }`}>
                    {trade.pnl != null ? formatPnl(trade.pnl) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{trade.ai_provider || '-'}</Badge>
                  </td>
                </tr>
              ))}
              {(!tradesData?.trades || tradesData.trades.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada trade
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tradesData && tradesData.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-border-dark">
            <span className="text-xs text-gray-400 font-mono">
              Hal {tradesData.page} dari {tradesData.total_pages} ({tradesData.total} total)
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= tradesData.total_pages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
