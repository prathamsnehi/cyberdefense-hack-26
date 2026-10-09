import { it, expect, vi, beforeEach } from 'vitest';
const client = vi.hoisted(() => ({ insert: vi.fn(), query: vi.fn(), options: undefined as unknown }));
vi.mock('@clickhouse/client', () => ({ createClient: (options: unknown) => { client.options = options; return client; } }));
import { insertEvents, timedQuery, insertRows } from '../src/clickhouse';
import type { AgentEvent } from '../src/contracts';
beforeEach(() => { client.insert.mockReset(); client.query.mockReset(); });
it('configures albert and acknowledged writes with consistent reads', () => {
  expect(client.options).toMatchObject({ database: 'albert', clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1, select_sequential_consistency: '1' } });
});
it('does not resolve before insert acknowledgement, and never retries an error', async () => {
  let acknowledge!: () => void;
  client.insert.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
  let settled = false;
  const promise = insertEvents([{ event_id: 'stable-id', agent_id: 'invoice-bot', guard: false } as unknown as AgentEvent]).then(() => { settled = true; });
  await Promise.resolve(); expect(settled).toBe(false); acknowledge(); await promise;
  expect(client.insert.mock.calls[0][0].values[0].event_id).toBe('stable-id');
  expect(client.insert.mock.calls[0][0].values[0]).not.toHaveProperty('guard');
  client.insert.mockRejectedValueOnce(new Error('timeout'));
  await expect(insertRows('agent_events', [{}])).rejects.toThrow('timeout');
  expect(client.insert).toHaveBeenCalledTimes(2);
});
it('reads true query statistics and rejects missing statistics', async () => {
  const json = vi.fn().mockResolvedValueOnce({ data: [{ n: 1 }], statistics: { elapsed: 0.012, rows_read: 900 } }).mockResolvedValueOnce({ data: [] });
  client.query.mockResolvedValue({ json });
  expect(await timedQuery('SELECT 1', { n: 1 })).toEqual({ rows: [{ n: 1 }], elapsedMs: 12, rowsRead: 900 });
  await expect(timedQuery('SELECT 1')).rejects.toThrow('statistics unavailable');
});
