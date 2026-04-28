import { Play, Square } from 'lucide-react'
import Button from '@/components/ui/Button'
import CapitalCards from '@/components/dashboard/CapitalCards'
import DailyProgress from '@/components/dashboard/DailyProgress'
import ActivePositions from '@/components/dashboard/ActivePositions'
import RecentTrades from '@/components/dashboard/RecentTrades'
import MarketScanner from '@/components/dashboard/MarketScanner'
import { useBotStatus, useStartBot, useStopBot } from '@/hooks/useBot'

export default function Dashboard() {
  const { data: botStatus } = useBotStatus()
  const startBot = useStartBot()
  const stopBot = useStopBot()

  const isRunning = botStatus?.is_running || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-sans font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {isRunning ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => stopBot.mutate()}
              disabled={stopBot.isPending}
              className="border-[#1A1A1A] dark:border-[#F5F5F5]"
            >
              <Square className="w-4 h-4 mr-2" />
              STOP BOT
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => startBot.mutate()}
              disabled={startBot.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              START BOT
            </Button>
          )}
        </div>
      </div>

      {/* Capital cards */}
      <CapitalCards />

      {/* Progress + Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyProgress />
        <MarketScanner />
      </div>

      {/* Positions + Recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivePositions />
        <RecentTrades />
      </div>
    </div>
  )
}
