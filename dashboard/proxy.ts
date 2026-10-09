import { createHash, timingSafeEqual } from 'node:crypto';
import { next, rewrite } from '@vercel/functions';

// This runs on Vercel's server before every route, including static assets.
// The Akash wrapper independently authenticates API requests with the same team login.
export const config = { runtime: 'nodejs' };

const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

function unavailable() {
  return new Response('Dashboard hosting configuration is unavailable.', { status: 503, headers: responseHeaders });
}

function authorized(request: Request, username: string, password: string) {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return false;
  const supplied = createHash('sha256').update(Buffer.from(match[1], 'base64')).digest();
  const expected = createHash('sha256').update(`${username}:${password}`, 'utf8').digest();
  return timingSafeEqual(supplied, expected);
}

function backendOrigin(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    // Configuration is an exact HTTPS origin, never a browser-supplied proxy target.
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) return undefined;
    return url;
  } catch { return undefined; }
}

export default function proxy(request: Request): Response {
  const username = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!username || !password || username.includes(':')) return unavailable();
  if (!authorized(request, username, password)) {
    return new Response('Sign in with the Albert AI team login.', {
      status: 401,
      headers: { ...responseHeaders, 'WWW-Authenticate': 'Basic realm="Albert AI team", charset="UTF-8"' },
    });
  }
  const incoming = new URL(request.url);
  if (incoming.pathname === '/api' || incoming.pathname.startsWith('/api/')) {
    const target = backendOrigin(process.env.ALBERT_BACKEND_URL);
    if (!target || target.origin === incoming.origin) return unavailable();
    // Assign the pathname instead of resolving it as a relative URL: // paths cannot change the host.
    target.pathname = incoming.pathname;
    target.search = incoming.search;
    const headers = new Headers(request.headers);
    headers.delete('host'); // The external rewrite must use the Akash gateway's host.
    // Authorization, Origin, Last-Event-ID and content headers travel to the authenticated wrapper.
    // A rewrite retains the original method/body and streams SSE without buffering in a function.
    return rewrite(target, { request: { headers }, headers: responseHeaders });
  }
  return next({ headers: responseHeaders });
}
