import { Sun, Moon, Menu } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useBotStore } from '@/store/botStore'
import ModeIndicator from './ModeIndicator'
import Badge from '@/components/ui/Badge'

interface NavbarProps {
  onMenuToggle?: () => void
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { darkMode, toggleDarkMode } = useSettingsStore()
  const botStatus = useBotStore((s) => s.botStatus)

  const statusVariant = {
    idle: 'default' as const,
    scanning: 'coral' as const,
    trading: 'success' as const,
    stopping: 'warning' as const,
  }

  return (
    <header className="h-16 border-b border-border dark:border-border-dark bg-white dark:bg-[#1A1A1A] flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252525]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <ModeIndicator />

        <Badge variant={statusVariant[botStatus.status as keyof typeof statusVariant] || 'default'}>
          {botStatus.status.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    </header>
  )
}
