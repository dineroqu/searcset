// Ad & tracking domain blocklist
const AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'facebook.net', 'fbcdn.net', 'facebook.com/tr',
  'amazon-adsystem.com', 'aax.amazon', 'adsystem.com',
  'adnxs.com', 'adsrvr.org', 'adform.net', 'serving-sys.com',
  'advertising.com', 'adcolony.com', 'admob.com',
  'moatads.com', 'moatpixel.com',
  'scorecardresearch.com', 'imrworldwide.com',
  'quantserve.com', 'quantcount.com',
  'outbrain.com', 'taboola.com', 'revcontent.com', 'mgid.com',
  'criteo.com', 'criteo.net',
  'pubmatic.com', 'rubiconproject.com', 'openx.net', 'casalemedia.com',
  'indexww.com', 'bidswitch.net', 'sharethrough.com',
  'hotjar.com', 'mouseflow.com', 'crazyegg.com', 'fullstory.com',
  'mixpanel.com', 'amplitude.com', 'segment.com', 'segment.io',
  'newrelic.com', 'nr-data.net',
  'chartbeat.com', 'parsely.com',
  'optimizely.com', 'abtasty.com',
  'adsafeprotected.com', 'iasds01.com',
  'demdex.net', 'omtrdc.net', 'everesttech.net',
  'turn.com', 'mathtag.com', 'rlcdn.com',
  'ad.doubleclick.net', 'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com', 'securepubads.g.doubleclick.net',
  'static.ads-twitter.com', 'analytics.twitter.com',
  'bat.bing.com', 'clarity.ms',
  'cdn.mxpnl.com', 'cdn.heapanalytics.com',
  'snap.licdn.com', 'px.ads.linkedin.com',
  'ct.pinterest.com', 'analytics.pinterest.com',
  'ads.reddit.com', 'events.reddit.com',
  'sp.analytics.yahoo.com',
  'pixel.wp.com',
  'stats.wp.com',
  'connect.facebook.net',
  'www.googletagmanager.com',
  'ssl.google-analytics.com',
  'www.google-analytics.com',
  'popads.net', 'popcash.net', 'propellerads.com',
  'exoclick.com', 'juicyads.com', 'trafficjunky.com',
  'adsterra.com', 'a-ads.com',
];

const AD_PATTERNS = [
  /\/ads?\//i,
  /\/adserv/i,
  /\/advert/i,
  /\/banner[s]?\//i,
  /\/pixel[s]?\//i,
  /\/track(er|ing)?\//i,
  /\/beacon\//i,
  /\/analytics\//i,
  /[?&]utm_/i,
  /\/impression/i,
  /\/click\?/i,
  /\/pop(up|under)/i,
  /\/sponsor/i,
  /1x1\.(gif|png|jpg)/i,
  /transparent\.(gif|png)/i,
  /spacer\.(gif|png)/i,
];

function isAdUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check domain blocklist
    for (const domain of AD_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    // Check URL patterns
    const fullUrl = url.toLowerCase();
    for (const pattern of AD_PATTERNS) {
      if (pattern.test(fullUrl)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

module.exports = { isAdUrl, AD_DOMAINS, AD_PATTERNS };
