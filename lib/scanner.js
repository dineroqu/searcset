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

// Known video CDN domains (helps classify ambiguous URLs)
const VIDEO_CDN_PATTERNS = [
  'b-cdn.net', 'cdn.vidoy', 'vidoycdn', 'bunnycdn',
  'cloudvideo', 'streamtape', 'doodstream', 'mixdrop',
  'upstream', 'mp4upload', 'fembed', 'feurl', 'fcdn',
  'gcloud.live', 'hxfile', 'streamsb', 'sbembed',
  'embedsito', 'vidoza', 'voe.sx', 'filemoon',
];

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

  // Check video CDN patterns - if URL is from a known video CDN and has a meaningful path
  const NON_VIDEO_EXTENSIONS = [
    '.css', '.js', '.html', '.htm', '.php', '.json', '.xml',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.txt', '.map', '.md',
    ...IMAGE_EXTENSIONS,
  ];
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (VIDEO_CDN_PATTERNS.some(p => lowerUrl.includes(p)) &&
        pathname.length > 1 &&
        !NON_VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext)) &&
        !lowerCt.includes('text/') && !lowerCt.includes('application/json') && !lowerCt.includes('application/javascript')) {
      return 'video';
    }
  } catch {}

  // Audio detection
  if (AUDIO_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ||
      AUDIO_MIMES.some(m => lowerCt.includes(m))) {
    return 'audio';
  }

  // Skip HTML pages, redirects, etc.
  if (lowerCt.includes('text/html') || lowerCt.includes('text/css') ||
      lowerCt.includes('application/javascript') || lowerCt.includes('text/javascript')) {
    return null;
  }

  // Image detection (only if URL looks like an image or MIME is image/*)
  if (IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ||
      lowerCt.startsWith('image/')) {
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

  if (asset.type === 'video') score += 100;
  if (asset.type === 'stream-hls' || asset.type === 'stream-dash') score += 90;
  if (asset.type === 'audio') score += 50;
  if (asset.type === 'image') score += 10;

  if (asset.size) {
    if (asset.size > 10 * 1024 * 1024) score += 50;
    else if (asset.size > 1 * 1024 * 1024) score += 30;
    else if (asset.size > 100 * 1024) score += 10;
  }

  if (asset.size && asset.size < 10 * 1024) score -= 20;

  return score;
}

// Scan DOM of a frame for video/audio/media assets
async function scanFrameDOM(frame, baseUrl) {
  try {
    return await frame.evaluate((baseUrl) => {
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

      // Iframes
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src) {
          found.push({ url: iframe.src, source: 'dom-iframe', type: 'iframe-src' });
        }
      });

      // Object/embed elements
      document.querySelectorAll('object, embed').forEach(el => {
        const src = el.data || el.src;
        if (src) found.push({ url: src, source: 'dom-embed' });
      });

      // Meta og:video
      document.querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]').forEach(meta => {
        if (meta.content) found.push({ url: meta.content, source: 'meta-og-video' });
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

      // Inline script scanning - comprehensive patterns
      document.querySelectorAll('script:not([src])').forEach(script => {
        const text = script.textContent;
        const patterns = [
          /["'](https?:\/\/[^"'\s]+\.(?:mp4|webm|m3u8|mpd|m4v|mov|avi|flv|mkv|mp3|wav|ogg|aac|flac|m4a)(?:\?[^"'\s]*)?)['"]/gi,
          /(?:src|url|file|source|video|stream|manifest|playlist|playerPath|fullURL|embedURL|videoUrl|videoSrc|mediaSrc|hlsUrl|dashUrl)\s*[:=]\s*["'](https?:\/\/[^"'\s]+)["']/gi,
          /["'](https?:\/\/[^"'\s]*(?:\/video\/|\/stream\/|\/media\/|\/content\/|\/embed|\/play)[^"'\s]*)["']/gi,
          /["'](https?:\/\/[^"'\s]*(?:b-cdn\.net|bunnycdn|cdn\.vid|vidoycdn|cloudvideo)[^"'\s]*)["']/gi,
          /(?:\.src\s*=\s*)["'](https?:\/\/[^"'\s]+)["']/gi,
        ];

        for (const pattern of patterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(text)) !== null) {
            found.push({ url: match[1], source: 'inline-script' });
          }
        }
      });

      // Background images (CSS) — only if few elements
      if (document.querySelectorAll('*').length < 500) {
        document.querySelectorAll('*').forEach(el => {
          const bg = getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1]) found.push({ url: match[1], source: 'css-bg' });
          }
        });
      }

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
    }, baseUrl);
  } catch (err) {
    console.log(`[SCAN] Frame scan error: ${err.message}`);
    return [];
  }
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
        '--autoplay-policy=no-user-gesture-required',
        '--disable-blink-features=AutomationControlled',
        '--headless=new',
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    // Anti-detection: hide webdriver flag
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Track ALL pages/frames network responses (including iframes)
    context.on('response', async (response) => {
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

    const page = await context.newPage();

    // === PAGE NAVIGATION ===
    console.log(`[SCAN] Navigating to: ${targetUrl}`);
    try {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (navErr) {
      console.log(`[SCAN] Navigation warning: ${navErr.message}, continuing...`);
    }

    // Wait for initial dynamic content
    await page.waitForTimeout(3000);

    // === CLICK PLAY BUTTONS / THUMBNAILS ===
    // Many video sites require a click to start loading the actual video
    console.log(`[SCAN] Attempting to trigger video playback...`);
    const playSelectors = [
      '.video-link',
      '.play-button', '.play-btn', '.btn-play',
      '[class*="play"]',
      '.vjs-big-play-button',
      '.plyr__control--overlaid',
      '.ytp-large-play-button',
      '[data-plyr="play"]',
      '.video-thumbnail', '.thumbnail-container',
      '.video-overlay', '.video-cover',
      '.jw-icon-display',
      '#player',
      'video',
    ];

    // Try clicking in main page AND all frames
    async function tryClickPlay(targetFrame, label) {
      for (const selector of playSelectors) {
        try {
          const el = await targetFrame.$(selector);
          if (el) {
            const box = await el.boundingBox();
            if (box && box.width > 20 && box.height > 20) {
              await el.click({ timeout: 2000 }).catch(() => {});
              console.log(`[SCAN] Clicked ${label}: ${selector}`);
              return true;
            }
          }
        } catch {}
      }
      return false;
    }

    // Click on main page first
    let clicked = await tryClickPlay(page, 'main');
    await page.waitForTimeout(3000);

    // Then try clicking in each frame (video sites often nest players in iframes)
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const furl = frame.url();
      if (furl === 'about:blank') continue;
      console.log(`[SCAN] Trying click in frame: ${furl.substring(0, 80)}`);
      const clickedFrame = await tryClickPlay(frame, 'frame');
      if (clickedFrame) {
        await page.waitForTimeout(4000);
      }
    }

    // Wait for iframes/players to load after clicks
    await page.waitForTimeout(3000);

    // === SCAN ALL FRAMES (including nested iframes) ===
    console.log(`[SCAN] Scanning frames...`);
    const allFrames = page.frames();
    console.log(`[SCAN] Found ${allFrames.length} frame(s)`);

    // Collect iframe URLs that might be video embed pages to visit separately
    const iframeUrls = new Set();

    for (const frame of allFrames) {
      try {
        const frameUrl = frame.url();
        console.log(`[SCAN] Scanning frame: ${frameUrl.substring(0, 100)}`);

        const domItems = await scanFrameDOM(frame, targetUrl);

        for (const item of domItems) {
          try {
            const absoluteUrl = new URL(item.url, frameUrl || targetUrl).href;
            if (isAdUrl(absoluteUrl)) continue;

            // Collect iframe URLs for deeper scanning
            if (item.source === 'dom-iframe') {
              iframeUrls.add(absoluteUrl);
              continue;
            }

            const type = item.type === 'iframe-src' ? null : (item.type || classifyAsset(absoluteUrl, item.contentType || ''));
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
      } catch (frameErr) {
        console.log(`[SCAN] Frame error: ${frameErr.message}`);
      }
    }

    // === DEEP IFRAME SCANNING ===
    // Navigate to iframe embed URLs in new tabs to find video sources inside them
    if (iframeUrls.size > 0) {
      console.log(`[SCAN] Deep scanning ${iframeUrls.size} iframe(s)...`);

      for (const iframeUrl of iframeUrls) {
        if (isAdUrl(iframeUrl)) continue;

        try {
          console.log(`[SCAN] Deep scan iframe: ${iframeUrl.substring(0, 100)}`);
          const iframePage = await context.newPage();

          try {
            await iframePage.goto(iframeUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 15000,
            });
          } catch (navErr) {
            console.log(`[SCAN] Iframe nav warning: ${navErr.message}`);
          }

          await iframePage.waitForTimeout(3000);

          // Try clicking play in the iframe page too
          for (const selector of playSelectors) {
            try {
              const el = await iframePage.$(selector);
              if (el) {
                const box = await el.boundingBox();
                if (box && box.width > 20 && box.height > 20) {
                  await el.click({ timeout: 2000 }).catch(() => {});
                  console.log(`[SCAN] Clicked in iframe: ${selector}`);
                  await iframePage.waitForTimeout(2000);
                  break;
                }
              }
            } catch {}
          }

          await iframePage.waitForTimeout(2000);

          // Scan all frames inside the iframe page
          for (const subFrame of iframePage.frames()) {
            const domItems = await scanFrameDOM(subFrame, iframeUrl);
            for (const item of domItems) {
              try {
                const absoluteUrl = new URL(item.url, iframeUrl).href;
                if (isAdUrl(absoluteUrl)) continue;

                const type = item.type || classifyAsset(absoluteUrl, item.contentType || '');
                if (!type && item.source !== 'dom-img' && item.source !== 'dom-img-lazy') continue;

                assets.push({
                  url: absoluteUrl,
                  type: type || 'image',
                  size: null,
                  contentType: item.contentType || '',
                  filename: extractFilename(absoluteUrl),
                  extension: getExtension(absoluteUrl),
                  source: item.source + ' (iframe)',
                  referer: iframeUrl,
                });
              } catch {}
            }
          }

          await iframePage.close();
        } catch (deepErr) {
          console.log(`[SCAN] Deep iframe error: ${deepErr.message}`);
        }
      }
    }

    // Scroll main page to trigger lazy loading
    await page.evaluate(async () => {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const height = document.body.scrollHeight;
      for (let i = 0; i < height; i += 400) {
        window.scrollTo(0, i);
        await delay(200);
      }
      window.scrollTo(0, 0);
    }).catch(() => {});

    await page.waitForTimeout(1000);

    // Merge network assets
    for (const [, asset] of networkAssets) {
      assets.push(asset);
    }

    // === HTTP FALLBACK: Follow iframe chains with raw HTTP when browser misses videos ===
    const videoCount = assets.filter(a => a.type === 'video' || a.type === 'stream-hls' || a.type === 'stream-dash').length;
    if (videoCount === 0) {
      console.log(`[SCAN] No videos found via browser, trying HTTP fallback...`);
      const httpAssets = await httpFallbackScan(targetUrl);
      for (const a of httpAssets) {
        assets.push(a);
      }
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

// HTTP-based fallback scanner that follows iframe chains
async function httpFallbackScan(targetUrl, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return [];
  const assets = [];

  try {
    const https = require('https');
    const http = require('http');
    let html = await httpGet(targetUrl);
    if (!html) return [];

    // Decode HTML entities so URLs with &amp; are handled properly
    html = html.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

    console.log(`[HTTP-FALLBACK] Depth ${depth}: Scanning ${targetUrl.substring(0, 80)} (${html.length} chars)`);

    // Extract video sources directly from HTML
    const videoPatterns = [
      // <source src="..."> with type attribute
      /<source\s[^>]*src=["']([^"']+)["'][^>]*type=["']([^"']*)["']/gi,
      // <source src="..."> without type
      /<source\s[^>]*src=["']([^"']+)["']/gi,
      // <video src="...">
      /<video\s[^>]*src=["']([^"']+)["']/gi,
      // Direct video URLs in scripts
      /["'](https?:\/\/[^"'\s]+\.(?:mp4|webm|m3u8|mpd|m4v|mov|avi|flv|mkv)(?:\?[^"'\s]*)?)['"]/gi,
      // Variable assignments with video URLs
      /(?:src|url|file|source|video|stream|manifest|playlist|playerPath|fullURL|embedURL|videoUrl|videoSrc|mediaSrc|hlsUrl)\s*[:=]\s*["'](https?:\/\/[^"'\s]+)["']/gi,
      // CDN URLs (bunny, vidoy, etc.)
      /["'](https?:\/\/[^"'\s]*(?:b-cdn\.net|bunnycdn|cdn\.vid|vidoycdn|cloudvideo|streamtape)[^"'\s]*)["']/gi,
    ];

    for (const pattern of videoPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        try {
          const absoluteUrl = new URL(url, targetUrl).href;
          if (isAdUrl(absoluteUrl)) continue;

          const contentType = match[2] || '';
          const type = classifyAsset(absoluteUrl, contentType);

          if (type) {
            assets.push({
              url: absoluteUrl,
              type,
              size: null,
              contentType,
              filename: extractFilename(absoluteUrl),
              extension: getExtension(absoluteUrl),
              source: `http-fallback (depth ${depth})`,
              referer: targetUrl,
            });
          }
        } catch {}
      }
    }

    // Extract iframe sources and follow them
    const iframePattern = /<iframe[^>]+src=["']([^"']+)["']/gi;
    let iframeMatch;
    const iframeUrls = new Set();
    while ((iframeMatch = iframePattern.exec(html)) !== null) {
      try {
        const iframeUrl = new URL(iframeMatch[1], targetUrl).href;
        if (!isAdUrl(iframeUrl)) {
          iframeUrls.add(iframeUrl);
        }
      } catch {}
    }

    // Also look for dynamically set iframe sources in scripts
    const dynamicIframePatterns = [
      /iframe\.src\s*=\s*["']([^"']+)["']/gi,
      /iframe\.src\s*=\s*['"]([^'"]+)['"]\s*\+\s*['"]?([^'";]+)['"]?/gi,
      /\.src\s*=\s*['"]([^'"]*(?:embed|player|video|ip129)[^'"]*)['"]/gi,
    ];

    // Also look for concatenated iframe src (e.g. iframe.src = '/path?id=' + varName)
    const scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of scriptBlocks) {
      const content = block.replace(/<\/?script[^>]*>/gi, '');

      // Look for iframe.src = '/path?id=' + variableName patterns
      const concatPattern = /(?:iframe|frame)\.src\s*=\s*['"]([^'"]+)['"]\s*\+\s*(\w+)/gi;
      let concatMatch;
      while ((concatMatch = concatPattern.exec(content)) !== null) {
        const pathPart = concatMatch[1];
        const varName = concatMatch[2];
        // Try to find the variable value
        const varPattern = new RegExp(`(?:var|let|const)\\s+${varName}\\s*=\\s*['"]([^'"]+)['"]`, 'i');
        const varMatch = content.match(varPattern);
        if (varMatch) {
          try {
            const fullPath = pathPart + varMatch[1];
            const fullUrl = new URL(fullPath, targetUrl).href;
            if (!isAdUrl(fullUrl)) iframeUrls.add(fullUrl);
          } catch {}
        }
      }

      // Also look for embed URLs in scripts
      const embedPatterns = [
        /["']((?:https?:\/\/[^"'\s]+)?\/embed[^"'\s]*)["']/gi,
        /["']([^"'\s]*embed\.php[^"'\s]*)["']/gi,
      ];
      for (const ep of embedPatterns) {
        ep.lastIndex = 0;
        let em;
        while ((em = ep.exec(content)) !== null) {
          try {
            const embedUrl = new URL(em[1], targetUrl).href;
            if (!isAdUrl(embedUrl)) iframeUrls.add(embedUrl);
          } catch {}
        }
      }
    }

    // Recursively scan iframe URLs
    for (const iframeUrl of iframeUrls) {
      console.log(`[HTTP-FALLBACK] Following iframe: ${iframeUrl.substring(0, 100)}`);
      const subAssets = await httpFallbackScan(iframeUrl, depth + 1, maxDepth);
      assets.push(...subAssets);
    }

  } catch (err) {
    console.log(`[HTTP-FALLBACK] Error at depth ${depth}: ${err.message}`);
  }

  return assets;
}

// Simple HTTP GET that returns response body as string
function httpGet(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };

    const req = mod.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        try {
          const redirectUrl = new URL(res.headers.location, url).href;
          resolve(httpGet(redirectUrl));
        } catch {
          resolve(null);
        }
        return;
      }

      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', () => resolve(null));
    });

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

module.exports = { scanUrl };
