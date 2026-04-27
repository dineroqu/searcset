const { chromium } = require('playwright');
const { isAdUrl } = require('./adfilter');
const { URL } = require('url');

// Asset type classification
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.3gp', '.ogv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma', '.opus'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
const STREAM_PATTERNS = ['.m3u8', '.mpd', '/manifest', '/playlist', '.ts'];

const VIDEO_MIMES = ['video/', 'application/x-mpegurl', 'application/vnd.apple.mpegurl', 'application/dash+xml'];
const AUDIO_MIMES = ['audio/'];
const IMAGE_MIMES = ['image/'];

function classifyAsset(url, contentType) {
  const lowerUrl = url.toLowerCase();
  const lowerCt = (contentType || '').toLowerCase();

  // Video detection
  if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ||
      VIDEO_MIMES.some(m => lowerCt.includes(m)) ||
      STREAM_PATTERNS.some(p => lowerUrl.includes(p))) {

    if (lowerUrl.includes('.m3u8') || lowerCt.includes('mpegurl')) return 'stream-hls';
    if (lowerUrl.includes('.mpd') || lowerCt.includes('dash')) return 'stream-dash';
    return 'video';
  }

  // Audio detection
  if (AUDIO_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ||
      AUDIO_MIMES.some(m => lowerCt.includes(m))) {
    return 'audio';
  }

  // Image detection
  if (IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ||
      IMAGE_MIMES.some(m => lowerCt.includes(m))) {
    return 'image';
  }

  return null;
}

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop().split(/[?#]/)[0].toLowerCase();
    if (ext && ext.length <= 5) return '.' + ext;
  } catch {}
  return '';
}

function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) return decodeURIComponent(last);
  } catch {}
  return null;
}

function deduplicateAssets(assets) {
  const seen = new Map();
  for (const asset of assets) {
    // Normalize URL for deduplication
    const key = asset.url.split('?')[0].split('#')[0];
    const existing = seen.get(key);
    if (!existing || (asset.size && (!existing.size || asset.size > existing.size))) {
      seen.set(key, asset);
    }
  }
  return Array.from(seen.values());
}

function scoreAsset(asset) {
  let score = 0;

  // Video gets highest priority
  if (asset.type === 'video') score += 100;
  if (asset.type === 'stream-hls' || asset.type === 'stream-dash') score += 90;
  if (asset.type === 'audio') score += 50;
  if (asset.type === 'image') score += 10;

  // Larger size = higher priority
  if (asset.size) {
    if (asset.size > 10 * 1024 * 1024) score += 50;      // >10MB
    else if (asset.size > 1 * 1024 * 1024) score += 30;   // >1MB
    else if (asset.size > 100 * 1024) score += 10;         // >100KB
  }

  // Penalize tiny assets (likely thumbnails or icons)
  if (asset.size && asset.size < 10 * 1024) score -= 20;

  return score;
}

async function scanUrl(targetUrl) {
  let browser;
  const assets = [];
  const networkAssets = new Map();

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // === NETWORK INTERCEPTION ===
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const status = response.status();
        const headers = response.headers();
        const contentType = headers['content-type'] || '';

        if (status < 200 || status >= 400) return;
        if (isAdUrl(url)) return;

        const type = classifyAsset(url, contentType);
        if (!type) return;

        const contentLength = headers['content-length'];
        const size = contentLength ? parseInt(contentLength, 10) : null;

        if (!networkAssets.has(url)) {
          networkAssets.set(url, {
            url,
            type,
            size,
            contentType: contentType.split(';')[0].trim(),
            filename: extractFilename(url),
            extension: getExtension(url),
            source: 'network',
            referer: targetUrl,
          });
        }
      } catch {}
    });

    // === PAGE NAVIGATION ===
    console.log(`[SCAN] Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    // Scroll to trigger lazy loading
    await page.evaluate(async () => {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const height = document.body.scrollHeight;
      for (let i = 0; i < height; i += 400) {
        window.scrollTo(0, i);
        await delay(200);
      }
      window.scrollTo(0, 0);
    });

    await page.waitForTimeout(2000);

    // === DOM SCANNING ===
    const domAssets = await page.evaluate(() => {
      const found = [];

      // Video elements
      document.querySelectorAll('video').forEach(video => {
        if (video.src) found.push({ url: video.src, source: 'dom-video' });
        if (video.currentSrc) found.push({ url: video.currentSrc, source: 'dom-video' });

        video.querySelectorAll('source').forEach(source => {
          if (source.src) found.push({ url: source.src, source: 'dom-source', contentType: source.type || '' });
        });
      });

      // Audio elements
      document.querySelectorAll('audio').forEach(audio => {
        if (audio.src) found.push({ url: audio.src, source: 'dom-audio' });
        if (audio.currentSrc) found.push({ url: audio.currentSrc, source: 'dom-audio' });

        audio.querySelectorAll('source').forEach(source => {
          if (source.src) found.push({ url: source.src, source: 'dom-source', contentType: source.type || '' });
        });
      });

      // Iframes (potential embedded videos)
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src) {
          const src = iframe.src;
          if (src.includes('youtube.com/embed') ||
              src.includes('player.vimeo.com') ||
              src.includes('dailymotion.com/embed') ||
              src.includes('facebook.com/plugins/video') ||
              src.includes('twitch.tv/embed') ||
              src.includes('streamable.com') ||
              src.includes('wistia.com')) {
            found.push({ url: src, source: 'dom-iframe-embed', type: 'embedded-video' });
          }
        }
      });

      // Object/embed elements
      document.querySelectorAll('object, embed').forEach(el => {
        const src = el.data || el.src;
        if (src) found.push({ url: src, source: 'dom-embed' });
      });

      // Meta og:video
      document.querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]').forEach(meta => {
        const content = meta.content;
        if (content) found.push({ url: content, source: 'meta-og-video' });
      });

      // JSON-LD VideoObject
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            if (item['@type'] === 'VideoObject') {
              if (item.contentUrl) found.push({ url: item.contentUrl, source: 'json-ld' });
              if (item.embedUrl) found.push({ url: item.embedUrl, source: 'json-ld' });
            }
          });
        } catch {}
      });

      // Background images (CSS)
      document.querySelectorAll('*').forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\(["']?(.*?)["']?\)/);
          if (match && match[1]) {
            found.push({ url: match[1], source: 'css-bg' });
          }
        }
      });

      // Large images
      document.querySelectorAll('img').forEach(img => {
        if (img.src && img.naturalWidth > 100 && img.naturalHeight > 100) {
          found.push({ url: img.src, source: 'dom-img' });
        }
        if (img.dataset.src) found.push({ url: img.dataset.src, source: 'dom-img-lazy' });
      });

      // Picture elements
      document.querySelectorAll('picture source').forEach(source => {
        if (source.srcset) {
          const urls = source.srcset.split(',').map(s => s.trim().split(' ')[0]);
          urls.forEach(url => found.push({ url, source: 'dom-picture' }));
        }
      });

      return found;
    });

    // Process DOM assets
    for (const item of domAssets) {
      try {
        const absoluteUrl = new URL(item.url, targetUrl).href;
        if (isAdUrl(absoluteUrl)) continue;

        const type = item.type || classifyAsset(absoluteUrl, item.contentType || '');
        if (!type && item.source !== 'dom-img' && item.source !== 'dom-img-lazy' && item.source !== 'css-bg' && item.source !== 'dom-picture') continue;

        assets.push({
          url: absoluteUrl,
          type: type || 'image',
          size: null,
          contentType: item.contentType || '',
          filename: extractFilename(absoluteUrl),
          extension: getExtension(absoluteUrl),
          source: item.source,
          referer: targetUrl,
        });
      } catch {}
    }

    // === INLINE SCRIPT SCANNING ===
    const scriptAssets = await page.evaluate(() => {
      const found = [];
      const scripts = document.querySelectorAll('script:not([src])');

      const patterns = [
        /["'](https?:\/\/[^"'\s]+\.(?:mp4|webm|m3u8|mpd|m4v|mov|avi|flv|mkv|mp3|wav|ogg|aac|flac|m4a)(?:\?[^"'\s]*)?)['"]/gi,
        /(?:src|url|file|source|video|stream|manifest|playlist)\s*[:=]\s*["'](https?:\/\/[^"'\s]+)["']/gi,
        /["'](https?:\/\/[^"'\s]*(?:\/video\/|\/stream\/|\/media\/|\/content\/)[^"'\s]*)["']/gi,
      ];

      scripts.forEach(script => {
        const text = script.textContent;
        for (const pattern of patterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(text)) !== null) {
            found.push({ url: match[1], source: 'inline-script' });
          }
        }
      });

      return found;
    });

    for (const item of scriptAssets) {
      try {
        const absoluteUrl = new URL(item.url, targetUrl).href;
        if (isAdUrl(absoluteUrl)) continue;

        const type = classifyAsset(absoluteUrl, '');
        if (!type) continue;

        assets.push({
          url: absoluteUrl,
          type,
          size: null,
          contentType: '',
          filename: extractFilename(absoluteUrl),
          extension: getExtension(absoluteUrl),
          source: 'inline-script',
          referer: targetUrl,
        });
      } catch {}
    }

    // Merge network assets
    for (const [, asset] of networkAssets) {
      assets.push(asset);
    }

    // Deduplicate
    const unique = deduplicateAssets(assets);

    // Score and sort
    unique.forEach(a => { a.score = scoreAsset(a); });
    unique.sort((a, b) => b.score - a.score);

    // Mark main video candidate
    const videos = unique.filter(a => a.type === 'video' || a.type === 'stream-hls' || a.type === 'stream-dash');
    if (videos.length > 0) {
      videos[0].isMainVideo = true;
    }

    // Page title
    const pageTitle = await page.title();

    console.log(`[SCAN] Found ${unique.length} assets (${videos.length} videos)`);

    return {
      pageTitle,
      totalAssets: unique.length,
      breakdown: {
        video: unique.filter(a => a.type === 'video').length,
        stream: unique.filter(a => a.type.startsWith('stream')).length,
        audio: unique.filter(a => a.type === 'audio').length,
        image: unique.filter(a => a.type === 'image').length,
        embeddedVideo: unique.filter(a => a.type === 'embedded-video').length,
      },
      assets: unique,
    };

  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scanUrl };
