import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import Dashboard from '@/pages/Dashboard'
import Trades from '@/pages/Trades'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import { useSettingsStore } from '@/store/settingsStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useState } from 'react'
import { Crosshair, X, LayoutDashboard, History, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useWebSocket()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-[#1A1A1A] shadow-xl">
            <div className="flex items-center justify-between px-4 h-16 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-2">
                <Crosshair className="w-6 h-6 text-coral" />
                <span className="font-sans font-bold text-sm">
                  POLY<span className="text-coral">SNIPER</span>
                </span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="py-4 px-2 space-y-1">
              {[
                { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
                { to: '/trades', icon: History, label: 'Trades' },
                { to: '/analytics', icon: BarChart3, label: 'Analytics' },
                { to: '/settings', icon: SettingsIcon, label: 'Settings' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                      isActive
                        ? 'bg-coral/10 text-coral font-medium'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252525]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface dark:bg-surface-dark">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const darkMode = useSettingsStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
