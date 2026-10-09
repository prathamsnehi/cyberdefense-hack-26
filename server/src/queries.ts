import { timedQuery } from './clickhouse';
import { bus } from './bus';

// Setup checks are retained in storage but never counted as application traffic.
const application = "NOT startsWith(run_id, 'setup-smoke') AND NOT startsWith(session_id, 'setup-smoke')";
// Audit IDs identify logical actions even if a producer inserted a duplicate.
const events = `(SELECT * FROM agent_events WHERE ${application} ORDER BY ts DESC LIMIT 1 BY event_id)`;
export async function metrics() {
  const data = await timedQuery<Record<string, number | null>>(`SELECT
    count() AS total_events,
    countIf(ts >= now() - INTERVAL 60 SECOND) / 60 AS events_per_sec,
    countIf(event_type = 'tool_blocked' AND ts >= now() - INTERVAL 24 HOUR) AS blocked_24h,
    if(countIf(guard_ms IS NOT NULL AND ts >= now() - INTERVAL 24 HOUR) = 0, NULL,
      quantileExactIf(0.95)(guard_ms, guard_ms IS NOT NULL AND ts >= now() - INTERVAL 24 HOUR)) AS guard_p95_ms
    FROM ${events}`);
  const f = await timedQuery<{ findings: number; rules_learned: number }>(`SELECT count() AS findings,
    (SELECT uniqExact(rule_id) FROM learned_rules) AS rules_learned FROM findings`);
  const recent = await recentBlocked();
  const row = data.rows[0];
  return { total_events: Number(row?.total_events ?? 0), events_per_sec: Number(row?.events_per_sec ?? 0),
    blocked_24h: Number(row?.blocked_24h ?? 0), guard_p95_ms: row?.guard_p95_ms == null ? null : Number(row.guard_p95_ms),
    findings: Number(f.rows[0]?.findings ?? 0), rules_learned: Number(f.rows[0]?.rules_learned ?? 0), recent_blocked: recent.rows };
}
export function recentBlocked() {
  return timedQuery(`SELECT * FROM ${events} WHERE event_type = 'tool_blocked' ORDER BY ts DESC LIMIT 20`);
}
export function fleetHunt(agent = '', limit = 100) {
  return timedQuery(`SELECT * FROM ${events} WHERE source = 'external' AND is_new_payee = 1
    AND event_type IN ('tool_call', 'tool_blocked') AND ({agent:String} = '' OR agent_id = {agent:String})
    ORDER BY ts DESC LIMIT {limit:UInt32}`, { agent, limit: Math.min(500, Math.max(1, Math.trunc(limit))) });
}
export async function attackScoreboard(run_id: string) {
  const scores = new Map<string, Record<string, unknown>>();
  for (const e of bus.history(run_id)) if (e.step === 'attack_batch' || e.step === 'verdict') {
    if (typeof e.data.version === 'string') scores.set(e.data.version, { ...scores.get(e.data.version), ...e.data, run_id });
  }
  // This panel's source is loop history, not a ClickHouse query.
  return { rows: [...scores.values()] };
}
