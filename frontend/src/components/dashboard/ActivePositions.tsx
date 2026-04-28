import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useActivePositions } from '@/hooks/useRealtime'
import { formatCurrency, formatPnl } from '@/lib/utils'

export default function ActivePositions() {
  const { data: positions } = useActivePositions()

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-border dark:border-border-dark">
        <h3 className="font-sans font-semibold text-sm">Posisi Aktif</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 font-mono">
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions && positions.length > 0 ? (
              positions.map((pos) => (
                <tr
                  key={pos.id}
                  className={`border-t border-border dark:border-border-dark hover:bg-surface dark:hover:bg-[#2a2a2a] ${
                    (pos.pnl ?? 0) > 0.5 ? 'blink-positive' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-sans text-xs max-w-[200px] truncate">{pos.market_question}</td>
                  <td className="px-4 py-3">
                    <Badge variant={pos.side === 'YES' ? 'success' : 'danger'}>
                      {pos.side}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(pos.size)}</td>
                  <td className="px-4 py-3 font-mono">${pos.entry_price.toFixed(4)}</td>
                  <td className={`px-4 py-3 font-mono font-medium ${
                    (pos.pnl ?? 0) >= 0 ? 'text-success' : 'text-red-500'
                  }`}>
                    {formatPnl(pos.pnl ?? 0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Tidak ada posisi aktif
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
