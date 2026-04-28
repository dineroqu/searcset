import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Settings as SettingsType } from '@/types'
import ModeToggle from '@/components/settings/ModeToggle'
import ApiKeyManager from '@/components/settings/ApiKeyManager'
import RiskSettings from '@/components/settings/RiskSettings'
import WalletConfig from '@/components/settings/WalletConfig'
import TelegramConfig from '@/components/settings/TelegramConfig'

const tabs = [
  { id: 'mode', label: 'Mode Operasi' },
  { id: 'ai', label: 'AI Providers' },
  { id: 'risk', label: 'Modal & Risiko' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'notifications', label: 'Notifikasi' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('mode')

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/')).data,
  })

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 font-sans">Memuat pengaturan...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-sans font-bold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border dark:border-border-dark">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-sans whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'text-coral border-b-2 border-coral font-medium bg-coral/5'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'mode' && <ModeToggle settings={settings} />}
        {activeTab === 'ai' && <ApiKeyManager />}
        {activeTab === 'risk' && <RiskSettings settings={settings} />}
        {activeTab === 'wallet' && <WalletConfig settings={settings} />}
        {activeTab === 'notifications' && <TelegramConfig settings={settings} />}
      </div>
    </div>
  )
}
