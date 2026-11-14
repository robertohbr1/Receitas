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
      if (req.url.startsWith('/api/instagram-media')) {
        return handleInstagramMediaProxy(req, res);
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
    const watchHtml = await fetchYoutubeWatchPageHtml(videoId);
    const transcriptXml = await fetchYoutubeTimedTextViaIosPlayer(videoId);
    sendPlainTextResponse(res, 200, `${watchHtml}\n${transcriptXml}`);
  } catch (err) {
    sendPlainTextResponse(res, 502, String(err));
  }
}

async function fetchYoutubeWatchPageHtml(videoId) {
  const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  return ytResponse.text();
}

async function fetchYoutubeTimedTextViaIosPlayer(videoId) {
  try {
    const playerResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'IOS',
            clientVersion: '20.03.02',
            deviceMake: 'Apple',
            deviceModel: 'iPhone16,2',
            osName: 'iPhone',
            osVersion: '18.2.1.22C161',
            hl: 'pt',
            gl: 'BR',
          },
        },
        videoId,
      }),
    });
    const playerData = await playerResp.json();
    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const targetTrack = tracks.find((t) => t.languageCode && t.languageCode.startsWith('pt')) || tracks[0];
    if (!targetTrack || !targetTrack.baseUrl) return '';
    const captionResp = await fetch(targetTrack.baseUrl);
    return captionResp.ok ? await captionResp.text() : '';
  } catch {
    return '';
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
  const embedResp = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  const embedHtml = embedResp.ok ? await embedResp.text() : '';
  if (postHtml.includes('og:description') || embedHtml) {
    return `${postHtml}\n${embedHtml}`;
  }
  const googlebotResp = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  return googlebotResp.ok ? await googlebotResp.text() : postHtml;
}

async function handleInstagramMediaProxy(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const mediaUrl = parsedUrl.searchParams.get('url') || '';
  if (!/^https:\/\/[a-z0-9.-]+(cdninstagram\.com|fbcdn\.net)\//i.test(mediaUrl)) {
    res.statusCode = 400;
    res.end('Invalid Instagram media URL');
    return;
  }
  try {
    const mediaResp = await fetch(mediaUrl);
    const arrayBuf = await mediaResp.arrayBuffer();
    res.setHeader('Content-Type', mediaResp.headers.get('content-type') || 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    sendPlainTextResponse(res, 502, String(err));
  }
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
