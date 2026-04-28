import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import api from '@/lib/api'
import type { Settings } from '@/types'
import { Send, FlaskConical } from 'lucide-react'

interface TelegramConfigProps {
  settings: Settings
}

export default function TelegramConfig({ settings }: TelegramConfigProps) {
  const [botToken, setBotToken] = useState(settings.telegram_bot_token)
  const [chatId, setChatId] = useState(settings.telegram_chat_id)
  const [notifyTrade, setNotifyTrade] = useState(settings.telegram_notify_trade)
  const [notifyError, setNotifyError] = useState(settings.telegram_notify_error)
  const [notifyDaily, setNotifyDaily] = useState(settings.telegram_notify_daily)
  const [notifyKillswitch, setNotifyKillswitch] = useState(settings.telegram_notify_killswitch)
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const queryClient = useQueryClient()

  useEffect(() => {
    setBotToken(settings.telegram_bot_token)
    setChatId(settings.telegram_chat_id)
    setNotifyTrade(settings.telegram_notify_trade)
    setNotifyError(settings.telegram_notify_error)
    setNotifyDaily(settings.telegram_notify_daily)
    setNotifyKillswitch(settings.telegram_notify_killswitch)
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => api.put('/settings/telegram', {
      bot_token: botToken,
      chat_id: chatId,
      notify_trade: notifyTrade,
      notify_error: notifyError,
      notify_daily: notifyDaily,
      notify_killswitch: notifyKillswitch,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const testMutation = useMutation({
    mutationFn: () => api.post('/settings/telegram/test'),
    onSuccess: (res) => setTestResult(res.data),
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setTestResult({ success: false, error: err.response?.data?.detail || 'Error' })
    },
  })

  const toggles = [
    { key: 'notifyTrade', label: 'Trade baru & ditutup', value: notifyTrade, setter: setNotifyTrade },
    { key: 'notifyError', label: 'Error & warning', value: notifyError, setter: setNotifyError },
    { key: 'notifyDaily', label: 'Ringkasan harian', value: notifyDaily, setter: setNotifyDaily },
    { key: 'notifyKillswitch', label: 'Kill switch aktif', value: notifyKillswitch, setter: setNotifyKillswitch },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-coral" />
          <h3 className="font-sans font-semibold">Telegram Notifikasi</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Bot Token</label>
            <Input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Chat ID</label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Simpan
            </Button>
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !botToken || !chatId}
            >
              <FlaskConical className="w-4 h-4 mr-1" />
              Test Kirim
            </Button>
          </div>

          {testResult && (
            <Badge variant={testResult.success ? 'success' : 'danger'}>
              {testResult.success ? 'Berhasil!' : testResult.error}
            </Badge>
          )}
        </div>
      </Card>

      <Card>
        <h4 className="font-sans font-medium text-sm mb-3">Event Notifikasi</h4>
        <div className="space-y-2">
          {toggles.map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center justify-between p-3 bg-surface dark:bg-[#1A1A1A] rounded-lg cursor-pointer"
            >
              <span className="text-sm font-sans">{toggle.label}</span>
              <button
                onClick={() => toggle.setter(!toggle.value)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  toggle.value ? 'bg-coral' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    toggle.value ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
