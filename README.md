# Polymarket Smart Sniper Bot v2.0

Bot trading otomatis untuk Polymarket dengan antarmuka web modern. Dirancang untuk pemula dengan modal kecil ($2-$10) yang ingin profit konsisten $5-$20/hari dengan risiko minimal.

## Fitur Utama

- **Testnet/Mainnet Mode** — Data nyata, eksekusi simulasi (testnet) atau real (mainnet)
- **Multi-AI Analyzer** — Support 8 provider AI (Anthropic, OpenAI, Gemini, Grok, OpenRouter, Mistral, Cohere, Ollama)
- **Smart Position Sizing** — Kelly Criterion dengan safety cap
- **Capital Protection** — Protected capital, profit lock 70/30, kill switch
- **Real-time Dashboard** — Harga BTC/ETH live, market scanner, P&L tracking
- **Semua konfigurasi via UI** — API keys, wallet, Telegram, risiko — semua di Settings

## Tech Stack

| Layer    | Teknologi                                |
|----------|------------------------------------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS  |
| Backend  | FastAPI, SQLAlchemy async, SQLite         |
| Charts   | Recharts                                 |
| State    | Zustand + React Query                    |
| Deploy   | Docker + Docker Compose + Nginx          |

## Quick Start

### Dengan Docker (Recommended)

```bash
git clone <repo-url>
cd polymarket-bot
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Buka http://localhost di browser.

### Development (Manual)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173 di browser.

## Konfigurasi

Semua pengaturan dikelola melalui UI web di halaman **Settings**:

### Tab Mode Operasi
- Toggle Testnet/Mainnet
- Reset virtual balance (testnet)

### Tab AI Providers
- Tambah/hapus provider AI
- Masukkan API key (terenkripsi)
- Test koneksi
- Atur urutan fallback prioritas

### Tab Modal & Risiko
- Protected capital & trading capital
- Min edge threshold
- Max % per trade
- Daily target & kill switch
- Durasi trading & max posisi bersamaan

### Tab Wallet
- Input private key (terenkripsi AES)
- Auto-detect wallet address

### Tab Notifikasi
- Telegram Bot Token & Chat ID
- Pilih event yang mau dikirim notifikasi
- Test kirim notifikasi

## Arsitektur

```
polymarket-bot/
├── backend/           # FastAPI server
│   ├── core/          # Trading engine
│   ├── api/routes/    # REST endpoints
│   ├── database/      # SQLAlchemy models
│   └── notifications/ # Telegram bot
├── frontend/          # React app
│   └── src/
│       ├── pages/     # Dashboard, Trades, Analytics, Settings
│       ├── components/# UI components
│       ├── store/     # Zustand stores
│       └── hooks/     # React hooks
├── docker-compose.yml
├── nginx.conf
└── scripts/           # Setup & deploy
```

## Keamanan

- Private key dienkripsi sebelum disimpan
- JWT authentication untuk akses API
- Tidak ada hardcoded API key di source code
- Gunakan wallet DEDICATED untuk bot ini

## License

MIT
