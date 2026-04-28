import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import api from '@/lib/api'
import type { AIProvider, ProviderName } from '@/types'
import { PROVIDER_INFO } from '@/types'
import { Plus, Trash2, FlaskConical, GripVertical, Star } from 'lucide-react'

export default function ApiKeyManager() {
  const [showAdd, setShowAdd] = useState(false)
  const queryClient = useQueryClient()

  const { data: providers = [] } = useQuery<AIProvider[]>({
    queryKey: ['aiProviders'],
    queryFn: async () => (await api.get('/settings/ai-providers')).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/settings/ai-providers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiProviders'] }),
  })

  const testMutation = useMutation({
    mutationFn: (id: number) => api.post(`/settings/ai-providers/${id}/test`),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.put(`/settings/ai-providers/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiProviders'] }),
  })

  const primaryMutation = useMutation({
    mutationFn: (id: number) =>
      api.put(`/settings/ai-providers/${id}`, { is_primary: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiProviders'] }),
  })

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">Aktif</Badge>
    if (status === 'error') return <Badge variant="danger">Error</Badge>
    return <Badge variant="warning">Belum dicek</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-sans font-semibold">AI Providers</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      {showAdd && <AddProviderForm onClose={() => setShowAdd(false)} />}

      {providers.length === 0 ? (
        <Card>
          <p className="text-center text-gray-400 text-sm py-4">
            Belum ada provider. Klik "Tambah" untuk memulai.
          </p>
        </Card>
      ) : (
        providers.map((provider) => (
          <Card key={provider.id} className="relative">
            <div className="flex items-start gap-3">
              <GripVertical className="w-4 h-4 text-gray-300 mt-1 cursor-grab" />

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans font-medium text-sm">
                    {PROVIDER_INFO[provider.provider as ProviderName]?.label || provider.provider}
                  </span>
                  {provider.is_primary && (
                    <Star className="w-4 h-4 text-coral fill-coral" />
                  )}
                  {statusBadge(provider.status)}
                </div>

                <p className="text-xs font-mono text-gray-400">{provider.model}</p>

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono">
                  <span>{provider.has_key ? 'API key dikonfigurasi' : 'Tanpa API key'}</span>
                  <span>·</span>
                  <span>{provider.total_requests} requests</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => primaryMutation.mutate(provider.id)}
                  title="Jadikan utama"
                >
                  <Star className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => testMutation.mutate(provider.id)}
                  title="Test koneksi"
                >
                  <FlaskConical className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMutation.mutate({
                    id: provider.id,
                    is_active: !provider.is_active,
                  })}
                >
                  {provider.is_active ? 'ON' : 'OFF'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => deleteMutation.mutate(provider.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}


function AddProviderForm({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = useState<ProviderName>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const queryClient = useQueryClient()

  const info = PROVIDER_INFO[provider]

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/settings/ai-providers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] })
      onClose()
    },
  })

  const handleSubmit = () => {
    addMutation.mutate({
      provider,
      api_key: apiKey || null,
      model: model || info.models[0] || '',
      base_url: baseUrl || null,
    })
  }

  return (
    <Card className="border-coral/30">
      <h4 className="font-sans font-medium text-sm mb-3">Tambah Provider</h4>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block font-sans">Provider</label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as ProviderName)
              setModel('')
            }}
            className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-[#1A1A1A] text-sm font-sans"
          >
            {(Object.keys(PROVIDER_INFO) as ProviderName[]).map((key) => (
              <option key={key} value={key}>{PROVIDER_INFO[key].label}</option>
            ))}
          </select>
        </div>

        {!info.hasBaseUrl && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
        )}

        {info.hasBaseUrl && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-sans">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 mb-1 block font-sans">Model</label>
          {info.hasCustomModel ? (
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="nama-model"
            />
          ) : (
            <select
              value={model || info.models[0]}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-[#1A1A1A] text-sm font-mono"
            >
              {info.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Menambahkan...' : 'Tambah'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </Card>
  )
}
