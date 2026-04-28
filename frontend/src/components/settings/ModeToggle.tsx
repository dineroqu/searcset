import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import api from '@/lib/api'
import type { Settings } from '@/types'

interface ModeToggleProps {
  settings: Settings
}

export default function ModeToggle({ settings }: ModeToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [resetAmount, setResetAmount] = useState('10')
  const queryClient = useQueryClient()

  const modeMutation = useMutation({
    mutationFn: (data: { mode: string; confirmation?: string }) =>
      api.post('/settings/mode', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setShowConfirm(false)
      setConfirmation('')
    },
  })

  const resetMutation = useMutation({
    mutationFn: (amount: number) =>
      api.post('/settings/virtual-balance/reset', { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['capital'] })
    },
  })

  const isTestnet = settings.mode === 'testnet'

  const handleToggle = () => {
    if (isTestnet) {
      setShowConfirm(true)
    } else {
      modeMutation.mutate({ mode: 'testnet' })
    }
  }

  const handleConfirmMainnet = () => {
    if (confirmation === 'SAYA MENGERTI') {
      modeMutation.mutate({ mode: 'mainnet', confirmation: 'SAYA MENGERTI' })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-sans font-semibold mb-4">Mode Operasi</h3>

        <div className="flex items-center justify-between p-4 bg-surface dark:bg-[#1A1A1A] rounded-lg">
          <div>
            <p className="font-sans font-medium">{isTestnet ? 'TESTNET' : 'MAINNET LIVE'}</p>
            <p className="text-xs text-gray-400 mt-1">
              {isTestnet
                ? 'Data nyata, eksekusi simulasi — aman untuk belajar'
                : 'Semua nyata — transaksi blockchain aktif'}
            </p>
          </div>

          <button
            onClick={handleToggle}
            className={`relative w-16 h-8 rounded-full transition-colors ${
              isTestnet ? 'bg-red-400' : 'bg-success'
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isTestnet ? 'left-1' : 'left-9'
              }`}
            />
          </button>
        </div>

        {/* Konfirmasi mainnet */}
        {showConfirm && (
          <div className="mt-4 p-4 bg-coral-light dark:bg-coral/20 rounded-lg border border-coral/30">
            <p className="text-sm font-sans font-medium text-coral-dark dark:text-coral mb-2">
              Peringatan Risiko
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              Mode Mainnet akan mengeksekusi transaksi NYATA di blockchain Polygon.
              Dana Anda berisiko. Pastikan Anda memahami risikonya.
            </p>
            <p className="text-xs text-gray-500 mb-2">Ketik "SAYA MENGERTI" untuk melanjutkan:</p>
            <div className="flex gap-2">
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="SAYA MENGERTI"
              />
              <Button
                onClick={handleConfirmMainnet}
                disabled={confirmation !== 'SAYA MENGERTI'}
                variant="danger"
                size="sm"
              >
                Aktifkan
              </Button>
              <Button
                onClick={() => { setShowConfirm(false); setConfirmation('') }}
                variant="ghost"
                size="sm"
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Virtual balance (testnet only) */}
      {isTestnet && (
        <Card>
          <h3 className="font-sans font-semibold mb-3">Virtual Balance</h3>
          <p className="text-xs text-gray-400 mb-3">Atur ulang saldo virtual untuk testnet</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={resetAmount}
              onChange={(e) => setResetAmount(e.target.value)}
              min="1"
              step="1"
            />
            <Button
              onClick={() => resetMutation.mutate(parseFloat(resetAmount))}
              variant="secondary"
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            Saldo saat ini: ${settings.virtual_balance.toFixed(2)}
          </p>
        </Card>
      )}
    </div>
  )
}
