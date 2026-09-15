import vercel from '../vercel.json' with { type: 'json' };
import pages from '../src/public/pages.json' with { type: 'json' };
import { assistant, json } from './assistant.mjs';

const publicPaths = new Set(pages.map((page) => page.path));
const sharedHeaders = vercel.headers.find((rule) => rule.source === '/(.*)').headers;

function applyHeaders(response, url) {
  const result = new Response(response.body, response);
  for (const { key, value } of sharedHeaders) result.headers.set(key, value);
  for (const rule of vercel.headers.filter((rule) => rule.source === url.pathname)) {
    for (const { key, value } of rule.headers) result.headers.set(key, value);
  }
  const path = url.pathname;
  if (path === '/api' || path.startsWith('/api/')) {
    result.headers.set('Cache-Control', 'no-store, private');
    result.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet');
  } else if (response.status >= 400 || path === '/tag' || path.startsWith('/tag/') || path.startsWith('/preview/') || url.searchParams.get('pa') === '1' || url.hostname.endsWith('.workers.dev') || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    result.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'hydraagro.sbs') {
      url.hostname = 'www.hydraagro.sbs';
      url.protocol = 'https:';
      return applyHeaders(new Response(null, { status: 308, headers: { Location: url.href } }), url);
    }
    let response;
    if (url.pathname === '/api/hydra-assistant') response = await assistant(request, env);
    else if (url.pathname === '/api/python-health' || url.pathname === '/api/health') {
      if (request.method === 'OPTIONS') response = new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
      else response = request.method === 'GET' ? json(200, { status: 'ok', runtime: 'cloudflare-workers' }) : json(405, { error: 'Método não permitido.' }, { Allow: 'GET, OPTIONS' });
    } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) response = json(404, { error: 'Rota não encontrada.' });
    else if (request.method !== 'GET' && request.method !== 'HEAD') response = json(405, { error: 'Método não permitido.' }, { Allow: 'GET, HEAD' });
    else {
      const normalized = url.pathname.replace(/\/(?:index\.html)?$/, '') || '/';
      if (publicPaths.has(normalized) && url.pathname !== normalized) {
        const location = new URL(url);
        location.pathname = normalized;
        response = new Response(null, { status: 308, headers: { Location: location.href } });
      } else {
        const assetUrl = new URL(url);
        if (publicPaths.has(url.pathname)) assetUrl.pathname += '/index.html';
        else if (url.pathname === '/' || url.pathname === '/tag' || url.pathname.startsWith('/tag/') || url.pathname.startsWith('/preview/')) assetUrl.pathname = '/index.html';
        response = await env.ASSETS.fetch(new Request(assetUrl, request));
        // Preserve the application's unknown-route screen while returning a real HTTP 404.
        if (response.status === 404 && !/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
          assetUrl.pathname = '/index.html';
          const shell = await env.ASSETS.fetch(new Request(assetUrl, request));
          response = new Response(shell.body, { status: 404, headers: shell.headers });
        }
      }
    }
    return applyHeaders(response, url);
  },
};
