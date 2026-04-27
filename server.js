const express = require('express');
const cors = require('cors');
const path = require('path');
const { scanUrl } = require('./lib/scanner');
const { proxyDownload } = require('./lib/downloader');

// Ensure DISPLAY is set for headed browser mode
if (!process.env.DISPLAY) process.env.DISPLAY = ':0';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Active scan sessions
const scanSessions = new Map();

// POST /api/scan - Start scanning a URL
app.post('/api/scan', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  scanSessions.set(sessionId, { status: 'scanning', assets: [], url });

  res.json({ sessionId, status: 'scanning' });

  // Run scan in background
  try {
    const assets = await scanUrl(url);
    scanSessions.set(sessionId, { status: 'complete', assets, url });
  } catch (err) {
    console.error('Scan error:', err);
    scanSessions.set(sessionId, { status: 'error', error: err.message, assets: [], url });
  }

  // Clean up old sessions after 30 min
  setTimeout(() => scanSessions.delete(sessionId), 30 * 60 * 1000);
});

// GET /api/scan/:sessionId - Get scan results
app.get('/api/scan/:sessionId', (req, res) => {
  const session = scanSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// POST /api/download - Proxy download an asset
app.post('/api/download', async (req, res) => {
  const { url, filename, referer } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    await proxyDownload(url, filename, referer, res);
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed: ' + err.message });
    }
  }
});

// GET /api/download - Direct download via query params
app.get('/api/download', async (req, res) => {
  const { url, filename, referer } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    await proxyDownload(url, filename, referer, res);
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed: ' + err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`[SYSTEM] Asset Downloader running on http://localhost:${PORT}`);
});
