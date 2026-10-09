import { createClient } from '@clickhouse/client';
import { randomUUID } from 'node:crypto';
import { env } from './env';
import type { AgentEvent } from './contracts';

export const ch = createClient({
  url: env.CLICKHOUSE_URL, username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD, database: env.CLICKHOUSE_DATABASE,
  // Every write is acknowledged; replica reads wait for preceding writes.
  clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1, select_sequential_consistency: '1' },
});
export type TimedRows<T> = { rows: T[]; elapsedMs: number; rowsRead: number };
export async function timedQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<TimedRows<T>> {
  const result = await ch.query({ query, query_params: params, format: 'JSON' });
  const body = await result.json<T>();
  if (!body.statistics) throw new Error('ClickHouse query statistics unavailable');
  return { rows: body.data, elapsedMs: body.statistics.elapsed * 1000, rowsRead: body.statistics.rows_read };
}
export async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!['agent_events', 'findings', 'payees', 'learned_rules'].includes(table)) throw new Error('Unsupported audit table');
  if (!rows.length) return;
  await ch.insert({ table, values: rows, format: 'JSONEachRow' });
}
export async function insertEvents(events: AgentEvent[]): Promise<void> {
  // Runner metadata may contain non-column fields such as guard; only write the shared contract.
  await insertRows('agent_events', events.map(e => ({ event_id: e.event_id ?? randomUUID(),
    run_id: e.run_id ?? '', guard_ms: e.guard_ms ?? null, agent_id: e.agent_id, version: e.version,
    session_id: e.session_id, event_type: e.event_type, tool: e.tool, args: e.args, source: e.source,
    is_new_payee: e.is_new_payee, attack_id: e.attack_id, fleet: e.fleet })));
}
