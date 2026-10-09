import { it, expect } from 'vitest';
import { bus } from '../src/bus';
import { subscribeRun, type Envelope } from '../src/event-stream';
import { app } from '../src/index';
it('replays before subscription, assigns ordered IDs and respects reconnect cursors', () => {
  bus.emit('stream-test', 'scan'); bus.emit('stream-test', 'finding');
  const live: Envelope[] = [];
  const sub = subscribeRun('stream-test', 1, e => live.push(e));
  expect(sub.replay.map(e => e.id)).toEqual([2]);
  bus.emit('stream-test', 'done');
  expect(live.map(e => e.id)).toEqual([3]);
  sub.off();
  expect(subscribeRun('stream-test', 3, () => {}).terminal).toBe(true);
  expect(() => subscribeRun('missing-run', 0, () => {})).toThrow('unavailable');
});
it('HTTP replays IDs, settles terminal errors and returns explicit unavailable history', async () => {
  bus.emit('http-stream', 'scan'); bus.emit('http-stream', 'error', { message: 'runner unavailable' });
  const response = await app.request('/loop/http-stream/events', { headers: { 'Last-Event-ID': '1' } });
  const body = await response.text();
  expect(body).toContain('id: 2'); expect(body).toContain('runner unavailable'); expect(body).not.toContain('"step":"scan"');
  expect((await app.request('/loop/missing/events')).status).toBe(404);
  expect((await app.request('/loop/http-stream/events', { headers: { 'Last-Event-ID': '99' } })).status).toBe(404);
});
it('separates runs and requires authentication to start mutations', async () => {
  bus.emit('second-run', 'done');
  expect(bus.history('second-run')).toHaveLength(1);
  expect(bus.history('http-stream')).toHaveLength(2);
  expect((await app.request('/loop/start', { method: 'POST' })).status).toBe(401);
});
