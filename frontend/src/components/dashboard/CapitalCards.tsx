import { Shield, TrendingUp, Lock, Target } from 'lucide-react'
import Card from '@/components/ui/Card'
import { useCapital } from '@/hooks/useBot'
import { formatCurrency, formatPnl } from '@/lib/utils'

export default function CapitalCards() {
  const { data: capital } = useCapital()

  const cards = [
    {
      label: 'Protected Capital',
      value: formatCurrency(capital?.protected_capital ?? 0),
      sub: 'Aman',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Trading Capital',
      value: formatCurrency(capital?.trading_capital ?? 0),
      sub: `${capital?.trading_capital && capital.protected_capital ? ((capital.trading_capital / capital.protected_capital - 1) * 100).toFixed(0) : '0'}%`,
      icon: TrendingUp,
      color: 'text-coral',
      bgColor: 'bg-coral-light dark:bg-coral/20',
    },
    {
      label: 'Locked Profit',
      value: formatCurrency(capital?.locked_profit ?? 0),
      sub: 'Tersimpan',
      icon: Lock,
      color: 'text-success',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Today P&L',
      value: formatPnl(capital?.today_pnl ?? 0),
      sub: `Target ${(capital?.target_progress ?? 0).toFixed(0)}%`,
      icon: Target,
      color: (capital?.today_pnl ?? 0) >= 0 ? 'text-success' : 'text-red-500',
      bgColor: (capital?.today_pnl ?? 0) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-sans mb-1">{card.label}</p>
              <p className={`text-xl font-mono font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-sans">{card.sub}</p>
            </div>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
