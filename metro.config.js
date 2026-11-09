const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return async (req, res, next) => {
      if (!req.url) {
        return metroMiddleware(req, res, next);
      }
      if (req.url.startsWith('/api/youtube-watch')) {
        return handleYoutubeWatchProxy(req, res);
      }
      if (req.url.startsWith('/api/instagram-post')) {
        return handleInstagramPostProxy(req, res);
      }
      if (req.url.startsWith('/api/recipe-webpage')) {
        return handleRecipeWebpageProxy(req, res);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

async function handleYoutubeWatchProxy(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const videoId = parsedUrl.searchParams.get('videoId') || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    res.statusCode = 400;
    res.end('Invalid videoId');
    return;
  }
  try {
    const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await ytResponse.text();
    sendPlainTextResponse(res, 200, html);
  } catch (err) {
    sendPlainTextResponse(res, 502, String(err));
  }
}

async function handleInstagramPostProxy(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const shortcode = parsedUrl.searchParams.get('shortcode') || '';
  if (!/^[A-Za-z0-9_-]{5,35}$/.test(shortcode)) {
    res.statusCode = 400;
    res.end('Invalid Instagram shortcode');
    return;
  }
  try {
    const combinedHtml = await fetchInstagramPublicSources(shortcode);
    sendPlainTextResponse(res, 200, combinedHtml);
  } catch (err) {
    sendPlainTextResponse(res, 502, String(err));
  }
}

async function fetchInstagramPublicSources(shortcode) {
  const crawlerHeaders = {
    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  };
  const postResp = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
    headers: crawlerHeaders,
  });
  const postHtml = postResp.ok ? await postResp.text() : '';
  if (postHtml.includes('og:description')) {
    return postHtml;
  }
  const googlebotResp = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  return googlebotResp.ok ? await googlebotResp.text() : postHtml;
}

function sendPlainTextResponse(res, statusCode, body) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = statusCode;
  res.end(body);
}

async function handleRecipeWebpageProxy(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const targetUrl = parsedUrl.searchParams.get('url') || '';
  if (!/^https?:\/\/([a-z0-9-]+\.)*globo\.com\//i.test(targetUrl)) {
    res.statusCode = 400;
    res.end('Unsupported recipe website domain');
    return;
  }
  try {
    const pageResp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await pageResp.text();
    sendPlainTextResponse(res, 200, html);
  } catch (err) {
    sendPlainTextResponse(res, 502, String(err));
  }
}

module.exports = config;
