import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import api from '@/lib/api'
import type { Settings } from '@/types'
import { Wallet, AlertTriangle, Trash2 } from 'lucide-react'

interface WalletConfigProps {
  settings: Settings
}

export default function WalletConfig({ settings }: WalletConfigProps) {
  const [privateKey, setPrivateKey] = useState('')
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (key: string) => api.post('/settings/wallet', { private_key: key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setPrivateKey('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => api.delete('/settings/wallet'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-coral" />
          <h3 className="font-sans font-semibold">Konfigurasi Wallet</h3>
        </div>

        {settings.has_wallet_key ? (
          <div className="space-y-3">
            <div className="bg-surface dark:bg-[#1A1A1A] rounded-lg p-3">
              <p className="text-xs text-gray-400 font-sans">Wallet Address</p>
              <p className="text-sm font-mono mt-1">{settings.wallet_address || 'Tidak tersedia'}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => removeMutation.mutate()}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Hapus Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-sans">Private Key</label>
              <Input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <Button
              onClick={() => saveMutation.mutate(privateKey)}
              disabled={!privateKey || saveMutation.isPending}
            >
              Simpan & Enkripsi
            </Button>
          </div>
        )}
      </Card>

      <Card className="bg-coral-light dark:bg-coral/10 border-coral/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-sans font-medium text-coral-dark dark:text-coral">
              Peringatan Keamanan Wallet
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Gunakan wallet DEDICATED khusus untuk bot ini. Jangan gunakan wallet utama Anda.
              Private key dienkripsi dengan AES sebelum disimpan di database lokal.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
