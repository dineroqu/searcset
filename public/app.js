// ============================================
//  WebGrab - Universal Asset Downloader
//  Frontend Application
// ============================================

let currentAssets = [];
let currentFilter = 'all';
let downloadQueue = [];
let downloadHistory = JSON.parse(localStorage.getItem('webgrab_history') || '[]');
let isDownloading = false;
let currentSessionId = null;
let pollInterval = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  updateHistoryUI();
  document.getElementById('urlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startScan();
  });
});

// ---- Scan ----
async function startScan() {
  const input = document.getElementById('urlInput');
  const btn = document.getElementById('scanBtn');
  const errorDiv = document.getElementById('inputError');
  let url = input.value.trim();

  errorDiv.textContent = '';

  if (!url) {
    errorDiv.textContent = 'ERROR: URL cannot be empty';
    return;
  }

  // Auto-add https if no protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
    input.value = url;
  }

  try {
    new URL(url);
  } catch {
    errorDiv.textContent = 'ERROR: Invalid URL format';
    return;
  }

  // UI state
  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = 'inline-flex';
  currentAssets = [];
  document.getElementById('results').style.display = 'none';

  // Show terminal
  const terminal = document.getElementById('terminal');
  terminal.style.display = 'block';
  clearTerminal();
  logTerminal('Initializing scan engine...', 'info');
  logTerminal(`Target: ${url}`, 'dim');

  try {
    // Start scan
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Scan failed');
    }

    currentSessionId = data.sessionId;
    logTerminal('Scan session created: ' + data.sessionId, 'success');
    logTerminal('Launching headless browser...', 'info');
    logTerminal('Intercepting network requests...', 'info');
    logTerminal('Parsing DOM elements...', 'info');
    logTerminal('Scanning inline scripts...', 'info');

    // Poll for results
    pollForResults(data.sessionId);

  } catch (err) {
    logTerminal('FATAL: ' + err.message, 'error');
    resetScanButton();
  }
}

function pollForResults(sessionId) {
  if (pollInterval) clearInterval(pollInterval);

  let dots = 0;
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/scan/${sessionId}`);
      const data = await res.json();

      if (data.status === 'complete') {
        clearInterval(pollInterval);
        pollInterval = null;

        logTerminal('Filtering ad/tracking domains...', 'info');
        logTerminal('Deduplicating assets...', 'info');
        logTerminal('Scoring & ranking assets...', 'info');

        const result = data.assets;
        logTerminal(`Scan complete! Found ${result.totalAssets} assets`, 'success');
        logTerminal(`  Videos: ${result.breakdown.video}  Streams: ${result.breakdown.stream}  Audio: ${result.breakdown.audio}  Images: ${result.breakdown.image}  Embeds: ${result.breakdown.embeddedVideo}`, 'success');

        currentAssets = result.assets;
        displayResults(result);
        resetScanButton();

      } else if (data.status === 'error') {
        clearInterval(pollInterval);
        pollInterval = null;
        logTerminal('ERROR: ' + (data.error || 'Scan failed'), 'error');
        resetScanButton();

      } else {
        // Still scanning
        dots = (dots + 1) % 4;
        // Keep waiting
      }
    } catch (err) {
      clearInterval(pollInterval);
      pollInterval = null;
      logTerminal('Connection error: ' + err.message, 'error');
      resetScanButton();
    }
  }, 1500);
}

function resetScanButton() {
  const btn = document.getElementById('scanBtn');
  btn.disabled = false;
  btn.querySelector('.btn-text').style.display = 'inline';
  btn.querySelector('.btn-loading').style.display = 'none';
}

// ---- Terminal ----
function logTerminal(msg, type = 'info') {
  const content = document.getElementById('terminalContent');
  const line = document.createElement('span');
  line.className = `log-line log-${type} fade-in`;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const prefix = type === 'error' ? '[ERR]' : type === 'warn' ? '[WRN]' : type === 'success' ? '[OK!]' : '[>>>]';

  line.textContent = `${timestamp} ${prefix} ${msg}`;
  content.appendChild(line);
  content.scrollTop = content.scrollHeight;
}

function clearTerminal() {
  document.getElementById('terminalContent').innerHTML = '';
}

// ---- Results Display ----
function displayResults(result) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.style.display = 'block';
  resultsDiv.classList.add('fade-in');

  // Page info
  const pageInfo = document.getElementById('pageInfo');
  pageInfo.innerHTML = `
    <div class="page-title">${escapeHtml(result.pageTitle || 'Untitled Page')}</div>
    <div class="page-url">${escapeHtml(document.getElementById('urlInput').value)}</div>
  `;

  // Stats
  const stats = document.getElementById('stats');
  stats.innerHTML = `
    <div class="stat-badge">
      <span class="stat-count">${result.totalAssets}</span>
      <span class="stat-label">Total</span>
    </div>
    <div class="stat-badge">
      <span class="stat-count">${result.breakdown.video}</span>
      <span class="stat-label">Video</span>
    </div>
    <div class="stat-badge">
      <span class="stat-count">${result.breakdown.stream}</span>
      <span class="stat-label">Stream</span>
    </div>
    <div class="stat-badge">
      <span class="stat-count">${result.breakdown.audio}</span>
      <span class="stat-label">Audio</span>
    </div>
    <div class="stat-badge">
      <span class="stat-count">${result.breakdown.image}</span>
      <span class="stat-label">Image</span>
    </div>
    <div class="stat-badge">
      <span class="stat-count">${result.breakdown.embeddedVideo}</span>
      <span class="stat-label">Embed</span>
    </div>
  `;

  // Reset filter
  currentFilter = 'all';
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');

  renderAssets(result.assets);
}

function renderAssets(assets) {
  const list = document.getElementById('assetList');

  if (assets.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128269;</div>
        <div>No assets found matching this filter</div>
      </div>
    `;
    return;
  }

  list.innerHTML = assets.map((asset, idx) => {
    const badgeClass = getBadgeClass(asset.type);
    const typeLabel = getTypeLabel(asset.type);
    const filename = asset.filename || truncateUrl(asset.url);
    const size = asset.size ? formatSize(asset.size) : '---';
    const isMain = asset.isMainVideo;

    return `
      <div class="asset-card ${isMain ? 'main-video' : ''} fade-in" style="animation-delay: ${idx * 30}ms" data-type="${asset.type}">
        <span class="asset-type-badge ${badgeClass}">${typeLabel}</span>
        <div class="asset-info">
          <div class="asset-filename" title="${escapeHtml(asset.url)}">
            ${isMain ? '<span class="main-video-tag">MAIN VIDEO</span> ' : ''}
            ${escapeHtml(filename)}
          </div>
          <div class="asset-meta">
            <span>${size}</span>
            <span>${asset.contentType || asset.extension || '?'}</span>
            <span>via ${asset.source}</span>
          </div>
        </div>
        <div class="asset-actions">
          <button class="queue-btn" onclick="addToQueue(${idx})" title="Add to queue">+ Q</button>
          <button class="dl-btn" onclick="downloadAsset(${idx})">DOWNLOAD</button>
        </div>
      </div>
    `;
  }).join('');
}

function filterAssets(filter, tabEl) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');

  let filtered = currentAssets;
  if (filter !== 'all') {
    filtered = currentAssets.filter(a => {
      if (filter === 'video') return a.type === 'video';
      if (filter === 'stream') return a.type === 'stream-hls' || a.type === 'stream-dash';
      if (filter === 'audio') return a.type === 'audio';
      if (filter === 'image') return a.type === 'image';
      if (filter === 'embedded') return a.type === 'embedded-video';
      return true;
    });
  }

  renderAssets(filtered);
}

// ---- Download ----
async function downloadAsset(index) {
  const asset = currentAssets[index];
  if (!asset) return;

  const filename = asset.filename || 'download' + (asset.extension || '');

  try {
    const params = new URLSearchParams({
      url: asset.url,
      filename,
      referer: asset.referer || '',
    });

    const a = document.createElement('a');
    a.href = '/api/download?' + params.toString();
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToHistory(filename, 'complete');

  } catch (err) {
    logTerminal('Download failed: ' + err.message, 'error');
    addToHistory(filename, 'failed');
  }
}

// Use fetch-based download for better UX with progress
async function downloadWithProgress(asset, queueIdx) {
  const filename = asset.filename || 'download' + (asset.extension || '');

  updateQueueStatus(queueIdx, 'downloading', 0);

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: asset.url,
        filename,
        referer: asset.referer || '',
      }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const contentLength = res.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      if (total > 0) {
        const pct = Math.round((received / total) * 100);
        updateQueueStatus(queueIdx, 'downloading', pct);
      }
    }

    // Create blob and download
    const blob = new Blob(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    updateQueueStatus(queueIdx, 'complete', 100);
    addToHistory(filename, 'complete');

  } catch (err) {
    updateQueueStatus(queueIdx, 'failed', 0);
    addToHistory(filename, 'failed');
    logTerminal('Queue download failed: ' + err.message, 'error');
  }
}

// ---- Queue ----
function addToQueue(index) {
  const asset = currentAssets[index];
  if (!asset) return;

  const filename = asset.filename || 'download' + (asset.extension || '');

  // Check duplicates
  if (downloadQueue.some(q => q.url === asset.url)) {
    logTerminal('Already in queue: ' + filename, 'warn');
    return;
  }

  downloadQueue.push({
    ...asset,
    displayName: filename,
    status: 'pending',
    progress: 0,
  });

  updateQueueUI();
  logTerminal('Added to queue: ' + filename, 'info');

  // Auto-start if not downloading
  if (!isDownloading) processQueue();
}

async function processQueue() {
  if (isDownloading) return;
  isDownloading = true;

  while (downloadQueue.length > 0) {
    const idx = downloadQueue.findIndex(q => q.status === 'pending');
    if (idx === -1) break;

    await downloadWithProgress(downloadQueue[idx], idx);
  }

  isDownloading = false;
}

function updateQueueStatus(idx, status, progress) {
  if (downloadQueue[idx]) {
    downloadQueue[idx].status = status;
    downloadQueue[idx].progress = progress;
    updateQueueUI();
  }
}

function updateQueueUI() {
  const section = document.getElementById('downloadQueue');
  const list = document.getElementById('queueList');

  if (downloadQueue.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  list.innerHTML = downloadQueue.map((item, idx) => `
    <div class="queue-item fade-in">
      <span class="queue-status ${item.status}">${item.status.toUpperCase()}</span>
      <span class="queue-filename">${escapeHtml(item.displayName)}</span>
      <div class="progress-bar-container">
        <div class="progress-bar ${item.status === 'downloading' ? 'active' : ''}" style="width: ${item.progress}%"></div>
      </div>
    </div>
  `).join('');
}

function clearQueue() {
  downloadQueue = downloadQueue.filter(q => q.status === 'downloading');
  updateQueueUI();
}

// ---- History ----
function addToHistory(filename, status) {
  const entry = {
    filename,
    status,
    time: new Date().toISOString(),
  };
  downloadHistory.unshift(entry);
  if (downloadHistory.length > 100) downloadHistory = downloadHistory.slice(0, 100);
  localStorage.setItem('webgrab_history', JSON.stringify(downloadHistory));
  updateHistoryUI();
}

function updateHistoryUI() {
  const countEl = document.getElementById('historyCount');
  const listEl = document.getElementById('historyList');

  countEl.textContent = downloadHistory.length;

  if (downloadHistory.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No downloads yet</div>';
    return;
  }

  listEl.innerHTML = downloadHistory.map(h => {
    const time = new Date(h.time).toLocaleTimeString('en-US', { hour12: false });
    const statusColor = h.status === 'complete' ? 'color: var(--accent)' : 'color: var(--red)';
    return `
      <div class="history-item">
        <span class="history-time">${time}</span>
        <span class="history-name">${escapeHtml(h.filename)}</span>
        <span class="history-status" style="${statusColor}">${h.status.toUpperCase()}</span>
      </div>
    `;
  }).join('');
}

function toggleHistory() {
  const list = document.getElementById('historyList');
  const icon = document.getElementById('historyIcon');
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  icon.innerHTML = isOpen ? '&#9654;' : '&#9660;';
}

// ---- Helpers ----
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '---';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function truncateUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.length > 60) {
      return '...' + path.slice(-57);
    }
    return parsed.hostname + path;
  } catch {
    return url.length > 60 ? '...' + url.slice(-57) : url;
  }
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function getBadgeClass(type) {
  if (type === 'video') return 'badge-video';
  if (type === 'stream-hls' || type === 'stream-dash') return 'badge-stream';
  if (type === 'audio') return 'badge-audio';
  if (type === 'image') return 'badge-image';
  if (type === 'embedded-video') return 'badge-embed';
  return 'badge-video';
}

function getTypeLabel(type) {
  if (type === 'video') return 'VIDEO';
  if (type === 'stream-hls') return 'HLS';
  if (type === 'stream-dash') return 'DASH';
  if (type === 'audio') return 'AUDIO';
  if (type === 'image') return 'IMAGE';
  if (type === 'embedded-video') return 'EMBED';
  return 'FILE';
}
