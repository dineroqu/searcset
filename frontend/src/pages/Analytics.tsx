import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Card from '@/components/ui/Card'
import api from '@/lib/api'

const COLORS = ['#FF6B6B', '#4CAF82', '#F5A623', '#6B8AFF', '#E55555', '#82ca9d']

export default function Analytics() {
  const { data: equityCurve = [] } = useQuery<{ date: string; cumulative: number }[]>({
    queryKey: ['equityCurve'],
    queryFn: async () => (await api.get('/analytics/equity-curve')).data,
  })

  const { data: dailyPnl = [] } = useQuery<{ date: string; pnl: number }[]>({
    queryKey: ['dailyPnl'],
    queryFn: async () => (await api.get('/analytics/daily-pnl')).data,
  })

  const { data: winLoss } = useQuery<{ wins: number; losses: number }>({
    queryKey: ['winLoss'],
    queryFn: async () => (await api.get('/analytics/win-loss')).data,
  })

  const { data: providerPerf = [] } = useQuery<{ provider: string; win_rate: number; total_pnl: number }[]>({
    queryKey: ['providerPerf'],
    queryFn: async () => (await api.get('/analytics/provider-performance')).data,
  })

  const { data: categoryBreakdown = [] } = useQuery<{ category: string; total_trades: number }[]>({
    queryKey: ['categoryBreakdown'],
    queryFn: async () => (await api.get('/analytics/category-breakdown')).data,
  })

  const winLossData = winLoss ? [
    { name: 'Win', value: winLoss.wins },
    { name: 'Loss', value: winLoss.losses },
  ] : []

  const noData = equityCurve.length === 0 && dailyPnl.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-sans font-bold">Analytics</h1>

      {noData ? (
        <Card>
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-sans mb-2">Belum ada data</p>
            <p className="text-sm">Mulai trading untuk melihat analytics</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Equity curve */}
          <Card>
            <h3 className="font-sans font-semibold text-sm mb-4">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={10} fontFamily="DM Mono" />
                <YAxis fontSize={10} fontFamily="DM Mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'DM Mono',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Daily P&L + Win/Loss */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-sans font-semibold text-sm mb-4">P&L Harian</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyPnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={10} fontFamily="DM Mono" />
                  <YAxis fontSize={10} fontFamily="DM Mono" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontFamily: 'DM Mono',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="pnl">
                    {dailyPnl.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? '#4CAF82' : '#FF6B6B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-sans font-semibold text-sm mb-4">Win/Loss Ratio</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#4CAF82" />
                    <Cell fill="#FF6B6B" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Provider performance + Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-sans font-semibold text-sm mb-4">Performa AI Provider</h3>
              {providerPerf.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={providerPerf} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" fontSize={10} fontFamily="DM Mono" />
                    <YAxis
                      type="category"
                      dataKey="provider"
                      fontSize={10}
                      fontFamily="DM Mono"
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontFamily: 'DM Mono',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="win_rate" fill="#FF6B6B" name="Win Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">Belum ada data</p>
              )}
            </Card>

            <Card>
              <h3 className="font-sans font-semibold text-sm mb-4">Kategori Market</h3>
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="total_trades"
                      nameKey="category"
                      label={({ category }) => category}
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">Belum ada data</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
