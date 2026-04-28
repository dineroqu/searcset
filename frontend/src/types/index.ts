export interface CapitalState {
  protected_capital: number
  trading_capital: number
  locked_profit: number
  today_pnl: number
  unrealized_pnl: number
  daily_target: number
  target_progress: number
  mode: string
}

export interface RiskStatus {
  kill_switch_active: boolean
  should_pause: boolean
  can_trade: boolean
  checks: RiskCheck[]
  consecutive_losses: number
  drawdown_pct: number
  today_pnl: number
  open_positions: number
}

export interface RiskCheck {
  name: string
  value: number
  limit: number
  triggered: boolean
  message: string
}

export interface BotStatus {
  status: string
  is_running: boolean
  is_stopping: boolean
  open_positions: number
}

export interface Trade {
  id: number
  mode: string
  market_id: string
  market_question: string
  market_category: string
  side: string
  size: number
  entry_price: number
  exit_price: number | null
  pnl: number | null
  status: string
  ai_provider: string | null
  ai_confidence: number | null
  edge: number | null
  kelly_fraction: number | null
  tx_hash: string | null
  opened_at: string | null
  closed_at: string | null
}

export interface TradeSummary {
  total_trades: number
  wins: number
  losses: number
  win_rate: number
  best_trade: number
  worst_trade: number
  total_pnl: number
}

export interface AIProvider {
  id: number
  provider: string
  model: string
  is_active: boolean
  is_primary: boolean
  priority_order: number
  base_url: string | null
  status: string
  has_key: boolean
  total_requests: number
  total_wins: number
  last_checked: string | null
}

export interface Settings {
  mode: string
  protected_capital: number
  trading_capital: number
  virtual_balance: number
  min_edge: number
  max_position_pct: number
  daily_target: number
  kill_switch_pct: number
  trading_duration_days: number
  max_concurrent: number
  consecutive_loss_limit: number
  wallet_address: string | null
  has_wallet_key: boolean
  telegram_bot_token: string
  telegram_chat_id: string
  telegram_notify_trade: boolean
  telegram_notify_error: boolean
  telegram_notify_daily: boolean
  telegram_notify_killswitch: boolean
  bot_status: string
  dark_mode: boolean
  start_date: string | null
}

export interface CryptoPrices {
  btcusdt: { price: number; change_24h: number; symbol?: string }
  ethusdt: { price: number; change_24h: number; symbol?: string }
}

export interface Market {
  id: string
  question: string
  category: string
  yes_price: number
  no_price: number
  liquidity: number
  volume: number
  end_date: string | null
}

export type ProviderName = 
  | 'anthropic' | 'openai' | 'gemini' | 'grok' 
  | 'openrouter' | 'mistral' | 'cohere' | 'ollama'

export const PROVIDER_INFO: Record<ProviderName, {
  label: string
  models: string[]
  hasCustomModel?: boolean
  hasBaseUrl?: boolean
}> = {
  anthropic: {
    label: 'Anthropic Claude',
    models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-opus-4-20250514'],
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
  gemini: {
    label: 'Google Gemini',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
  grok: {
    label: 'xAI Grok',
    models: ['grok-beta', 'grok-2'],
  },
  openrouter: {
    label: 'OpenRouter',
    models: [],
    hasCustomModel: true,
  },
  mistral: {
    label: 'Mistral AI',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
  },
  cohere: {
    label: 'Cohere',
    models: ['command-r', 'command-r-plus'],
  },
  ollama: {
    label: 'Ollama (Local)',
    models: [],
    hasCustomModel: true,
    hasBaseUrl: true,
  },
}
