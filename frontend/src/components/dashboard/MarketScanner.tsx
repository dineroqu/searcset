import { Loader2, Wifi } from 'lucide-react'
import Card from '@/components/ui/Card'
import { useBotStore } from '@/store/botStore'
import { useMarkets, useCryptoPrices } from '@/hooks/useBot'
import { formatPrice } from '@/lib/utils'

export default function MarketScanner() {
  const botStatus = useBotStore((s) => s.botStatus)
  const cryptoPrices = useBotStore((s) => s.cryptoPrices)
  const { data: pricesData } = useCryptoPrices()
  const { data: marketsData } = useMarkets()

  const prices = pricesData || cryptoPrices
  const btc = prices?.btcusdt || { price: 0, change_24h: 0 }
  const eth = prices?.ethusdt || { price: 0, change_24h: 0 }
  const marketCount = marketsData?.count ?? 0

  return (
    <Card>
      <h3 className="font-sans font-semibold text-sm mb-4">Live Feed</h3>

      {/* Crypto ticker */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface dark:bg-[#1A1A1A] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">BTC/USDT</span>
            <Wifi className="w-3 h-3 text-success" />
          </div>
          <p className="text-lg font-mono font-bold mt-1">{formatPrice(btc.price)}</p>
          <p className={`text-xs font-mono ${btc.change_24h >= 0 ? 'text-success' : 'text-red-500'}`}>
            {btc.change_24h >= 0 ? '+' : ''}{btc.change_24h.toFixed(2)}%
          </p>
        </div>
        <div className="bg-surface dark:bg-[#1A1A1A] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">ETH/USDT</span>
            <Wifi className="w-3 h-3 text-success" />
          </div>
          <p className="text-lg font-mono font-bold mt-1">{formatPrice(eth.price)}</p>
          <p className={`text-xs font-mono ${eth.change_24h >= 0 ? 'text-success' : 'text-red-500'}`}>
            {eth.change_24h >= 0 ? '+' : ''}{eth.change_24h.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Scanner status */}
      <div className="bg-surface dark:bg-[#1A1A1A] rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {botStatus.is_running ? (
            <Loader2 className="w-4 h-4 text-coral animate-spin" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="text-sm font-sans">
            {botStatus.is_running ? 'Scanning markets...' : 'Scanner idle'}
          </span>
        </div>
        <span className="text-sm font-mono text-coral font-medium">{marketCount} markets</span>
      </div>
    </Card>
  )
}
