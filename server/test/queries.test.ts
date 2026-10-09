import { it, expect, vi, beforeEach } from 'vitest';
const query = vi.hoisted(() => vi.fn());
vi.mock('../src/clickhouse', () => ({ timedQuery: query }));
import { metrics, fleetHunt, attackScoreboard } from '../src/queries';
import { bus } from '../src/bus';
beforeEach(() => query.mockReset());
it('empty metrics use genuine zero counts and null unmeasured latency', async () => {
  query.mockResolvedValueOnce({ rows: [{ total_events: '0', events_per_sec: 0, blocked_24h: '0', guard_p95_ms: null }] })
    .mockResolvedValueOnce({ rows: [{ findings: '0', rules_learned: '0' }] }).mockResolvedValueOnce({ rows: [] });
  expect(await metrics()).toEqual({ total_events: 0, events_per_sec: 0, blocked_24h: 0, guard_p95_ms: null, findings: 0, rules_learned: 0, recent_blocked: [] });
  const sql = query.mock.calls[0][0];
  expect(sql).toContain('LIMIT 1 BY event_id'); expect(sql).toContain('setup-smoke');
  expect(query.mock.calls[1][0]).toContain('FROM learned_rules');
});
it('keeps failure unavailable rather than converting failed queries into zero', async () => {
  query.mockRejectedValue(new Error('offline'));
  await expect(metrics()).rejects.toThrow('offline');
});
it('binds fleet filters and retains actual ClickHouse query statistics', async () => {
  query.mockResolvedValue({ rows: [], rowsRead: 733, elapsedMs: 12.3 });
  expect(await fleetHunt("agent' OR 1=1 --")).toMatchObject({ rowsRead: 733, elapsedMs: 12.3 });
  expect(query.mock.calls[0][0]).not.toContain("agent' OR 1=1 --");
  expect(query.mock.calls[0][1]).toEqual({ agent: "agent' OR 1=1 --", limit: 100 });
});
it('scoreboards replace repeated summaries within one run and preserve final verdict data', async () => {
  bus.emit('scores-one', 'attack_batch', { version: 'v1', total: 8, succeeded: 2 });
  bus.emit('scores-one', 'attack_batch', { version: 'v1', total: 8, succeeded: 2 });
  bus.emit('scores-one', 'verdict', { version: 'v1', attacks_total: 8, attacks_succeeded: 1, accepted: false });
  bus.emit('scores-two', 'attack_batch', { version: 'v1', total: 4, succeeded: 0 });
  expect((await attackScoreboard('scores-one')).rows).toEqual([expect.objectContaining({ run_id: 'scores-one', total: 8, attacks_succeeded: 1 })]);
  expect((await attackScoreboard('scores-two')).rows).toEqual([expect.objectContaining({ total: 4 })]);
});
