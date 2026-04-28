import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import api from '@/lib/api'
import type { Settings } from '@/types'

interface RiskSettingsProps {
  settings: Settings
}

export default function RiskSettings({ settings }: RiskSettingsProps) {
  const [form, setForm] = useState({
    protected_capital: settings.protected_capital,
    trading_capital: settings.trading_capital,
    min_edge: settings.min_edge,
    max_position_pct: settings.max_position_pct,
    daily_target: settings.daily_target,
    kill_switch_pct: settings.kill_switch_pct,
    trading_duration_days: settings.trading_duration_days,
    max_concurrent: settings.max_concurrent,
    consecutive_loss_limit: settings.consecutive_loss_limit,
  })

  useEffect(() => {
    setForm({
      protected_capital: settings.protected_capital,
      trading_capital: settings.trading_capital,
      min_edge: settings.min_edge,
      max_position_pct: settings.max_position_pct,
      daily_target: settings.daily_target,
      kill_switch_pct: settings.kill_switch_pct,
      trading_duration_days: settings.trading_duration_days,
      max_concurrent: settings.max_concurrent,
      consecutive_loss_limit: settings.consecutive_loss_limit,
    })
  }, [settings])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.put('/settings/risk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const fields = [
    { key: 'protected_capital', label: 'Protected Capital ($)', type: 'number', step: '0.5' },
    { key: 'trading_capital', label: 'Trading Capital ($)', type: 'number', step: '0.5' },
    { key: 'daily_target', label: 'Daily Profit Target ($)', type: 'number', step: '0.5' },
    { key: 'min_edge', label: 'Min Edge Threshold', type: 'range', min: 0.05, max: 0.50, step: 0.01 },
    { key: 'max_position_pct', label: 'Max % Per Trade', type: 'range', min: 0.05, max: 0.50, step: 0.05 },
    { key: 'kill_switch_pct', label: 'Kill Switch %', type: 'range', min: 0.10, max: 0.80, step: 0.05 },
    { key: 'trading_duration_days', label: 'Durasi Trading (hari)', type: 'number', step: '1' },
    { key: 'max_concurrent', label: 'Max Posisi Bersamaan', type: 'number', step: '1' },
    { key: 'consecutive_loss_limit', label: 'Max Loss Berturut', type: 'number', step: '1' },
  ] as const

  return (
    <Card>
      <h3 className="font-sans font-semibold mb-4">Modal & Risiko</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-gray-400 mb-1 block font-sans">
              {field.label}
              {field.type === 'range' && (
                <span className="ml-2 font-mono text-coral">
                  {((form[field.key as keyof typeof form] as number) * 100).toFixed(0)}%
                </span>
              )}
            </label>
            {field.type === 'range' ? (
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field.key]: parseFloat(e.target.value) })}
                className="w-full accent-coral"
              />
            ) : (
              <Input
                type="number"
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field.key]: parseFloat(e.target.value) })}
                step={field.step}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={() => mutation.mutate(form)}
        className="mt-4"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </Button>
    </Card>
  )
}
