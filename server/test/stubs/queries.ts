// Test stub for server/src/queries.ts (WS-C). Same export names, no ClickHouse.
const empty = () => ({ rows: [] as Record<string, unknown>[], elapsedMs: 0, rowsRead: 0 });
export async function metrics() {
  return { events_per_sec: 0, total_events: 0, blocked_24h: 0, findings: 0, rules_learned: 0 };
}
export async function recentBlocked() { return empty(); }
export async function fleetHunt() { return empty(); }
export async function topFlaws() { return empty(); }
export async function attackScoreboard(_run_id: string) { return empty(); }
