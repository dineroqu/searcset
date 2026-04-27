# WebGrab — Universal Asset Downloader

A web-based universal asset downloader inspired by 1DM (Internet Download Manager), featuring advanced video detection, ad filtering, and a dark terminal-themed UI.

## Features

- **Deep URL Scanning** — Uses Playwright headless browser to navigate pages, intercept network requests, parse DOM, and scan inline scripts
- **Advanced Video Detection** — Detects MP4, WebM, HLS (m3u8), DASH (mpd), embedded players (YouTube, Vimeo, etc.), and custom video players
- **Ad & Tracker Filtering** — Built-in blocklist of 80+ ad/tracking domains plus pattern-based filtering
- **Smart Asset Ranking** — Scores and prioritizes assets by type and size, auto-identifies the "main video"
- **Download Queue** — Add multiple assets to queue with progress tracking
- **Download History** — Persistent history stored in localStorage
- **Terminal-themed UI** — Dark mode with green/cyan accents, monospace fonts, scanline effects

## Tech Stack

- **Backend**: Node.js, Express, Playwright (Chromium)
- **Frontend**: Vanilla HTML/CSS/JS (no framework dependencies)
- **Scanning**: Playwright for headless browsing, network interception, DOM analysis

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd web-asset-downloader
npm install
npx playwright install chromium
```

### Running

```bash
npm start
```

Open http://localhost:3000 in your browser.

## How It Works

1. Enter a URL in the input field
2. The backend launches a headless Chromium browser via Playwright
3. It navigates to the page and:
   - Intercepts all network responses (looking for media content types)
   - Parses `<video>`, `<audio>`, `<source>`, `<iframe>` elements
   - Scans `<meta>` OpenGraph tags and JSON-LD structured data
   - Searches inline `<script>` content for media URLs
   - Scrolls the page to trigger lazy-loaded content
4. All detected assets are filtered (removing ads/trackers), deduplicated, scored, and ranked
5. Results are displayed in the terminal-themed UI with filter tabs and download controls

## Limitations

- Only downloads publicly accessible assets
- Does not bypass DRM protection
- Does not bypass login/authentication walls
- HLS/DASH streams are detected but streamed as-is (no server-side conversion)

## License

MIT
