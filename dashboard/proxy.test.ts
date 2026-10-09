// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import proxy from './proxy';

const login = `Basic ${Buffer.from('demo:team-password').toString('base64')}`;
const request = (path: string, init: RequestInit = {}) => {
  const headers = new Headers({ Authorization: login });
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  return new Request(`https://albert.example${path}`, { ...init, headers });
};

beforeEach(() => {
  vi.stubEnv('DASHBOARD_USER', 'demo');
  vi.stubEnv('DASHBOARD_PASSWORD', 'team-password');
  vi.stubEnv('ALBERT_BACKEND_URL', 'https://akash.example');
});
afterEach(() => vi.unstubAllEnvs());

describe('Vercel dashboard routing boundary', () => {
  it.each(['/', '/assets/app.js', '/api/metrics', '/api/loop/run-1/events'])('protects %s before routing', (path) => {
    const response = proxy(request(path, { headers: { Authorization: 'Basic incorrect' } }));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Albert AI team');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.has('x-middleware-rewrite')).toBe(false);
    expect(response.headers.has('x-middleware-next')).toBe(false);
  });

  it('fails closed when team credentials are missing', () => {
    vi.stubEnv('DASHBOARD_PASSWORD', '');
    expect(proxy(request('/')).status).toBe(503);
  });

  it('rejects missing credentials and a validly encoded incorrect password', () => {
    expect(proxy(new Request('https://albert.example/')).status).toBe(401);
    const wrongLogin = `Basic ${Buffer.from('demo:wrong-password').toString('base64')}`;
    expect(proxy(request('/api/loop/start', { headers: { Authorization: wrongLogin } })).status).toBe(401);
  });

  it('continues authenticated static requests without embedding credentials', async () => {
    const response = proxy(request('/assets/app.js'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).toBe('');
    expect([...response.headers.values()].join(' ')).not.toContain('team-password');
  });

  it('rewrites API calls only to the configured HTTPS origin with query and SSE cursor intact', () => {
    const source = request('/api/loop/run-1/events?after=7&label=hello%20world', {
      headers: { 'Last-Event-ID': '7', Accept: 'text/event-stream', Host: 'albert.example' },
    });
    const response = proxy(source);
    expect(response.headers.get('x-middleware-rewrite')).toBe('https://akash.example/api/loop/run-1/events?after=7&label=hello%20world');
    expect(response.headers.get('x-middleware-request-last-event-id')).toBe('7');
    expect(response.headers.get('x-middleware-request-accept')).toBe('text/event-stream');
    expect(response.headers.get('x-middleware-request-authorization')).toBe(login);
    expect(response.headers.has('x-middleware-request-host')).toBe(false);
  });

  it('retains mutation method/body and forwards the original browser origin for backend checks', async () => {
    const source = request('/api/loop/start', { method: 'POST', body: '{"agent_id":"invoice-bot"}',
      headers: { 'Content-Type': 'application/json', Origin: 'https://albert.example', 'Sec-Fetch-Site': 'same-origin' } });
    const response = proxy(source);
    expect(response.headers.get('x-middleware-rewrite')).toBe('https://akash.example/api/loop/start');
    expect(response.headers.get('x-middleware-request-origin')).toBe('https://albert.example');
    expect(response.headers.get('x-middleware-request-sec-fetch-site')).toBe('same-origin');
    expect(response.headers.get('x-middleware-request-content-type')).toBe('application/json');
    expect(source.method).toBe('POST');
    expect(source.bodyUsed).toBe(false);
    expect(await source.text()).toBe('{"agent_id":"invoice-bot"}');
  });

  it.each(['', 'http://akash.example', 'https://user:secret@akash.example', 'https://akash.example/api',
    'https://akash.example?target=other', 'https://akash.example#fragment', 'not-a-url', 'https://albert.example'])
  ('rejects unsafe or ambiguous backend configuration %s', (backend) => {
    vi.stubEnv('ALBERT_BACKEND_URL', backend);
    const response = proxy(request('/api/metrics'));
    expect(response.status).toBe(503);
    expect(response.headers.has('x-middleware-rewrite')).toBe(false);
  });

  it('does not let a target query parameter select another backend', () => {
    const response = proxy(request('/api/metrics?target=https%3A%2F%2Fattacker.example'));
    expect(new URL(response.headers.get('x-middleware-rewrite')!).origin).toBe('https://akash.example');
  });

  it('does not proxy routes that merely begin with api', () => {
    expect(proxy(request('/api-other')).headers.get('x-middleware-next')).toBe('1');
  });
});
