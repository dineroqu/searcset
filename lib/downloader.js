const https = require('https');
const http = require('http');
const { URL } = require('url');
const contentDisposition = require('content-disposition');

async function proxyDownload(assetUrl, filename, referer, res) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(assetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
    };

    if (referer) {
      headers['Referer'] = referer;
      headers['Origin'] = new URL(referer).origin;
    }

    const request = client.get(assetUrl, { headers, timeout: 30000 }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, assetUrl).href;
        return proxyDownload(redirectUrl, filename, referer, res).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const ct = response.headers['content-type'] || 'application/octet-stream';
      const cl = response.headers['content-length'];

      const downloadName = filename || guessFilename(assetUrl, ct);

      res.setHeader('Content-Type', ct);
      if (cl) res.setHeader('Content-Length', cl);
      res.setHeader('Content-Disposition', contentDisposition(downloadName));
      res.setHeader('Cache-Control', 'no-cache');

      response.pipe(res);
      response.on('end', resolve);
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function guessFilename(url, contentType) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) {
      return decodeURIComponent(last).substring(0, 200);
    }
  } catch {}

  // Fallback based on content type
  const extMap = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/x-mpegurl': '.m3u8',
    'application/vnd.apple.mpegurl': '.m3u8',
  };

  const ext = extMap[contentType] || '';
  return 'download_' + Date.now() + ext;
}

module.exports = { proxyDownload };
