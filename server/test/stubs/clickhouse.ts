// Stub until WS-C's src/clickhouse.ts lands. Same exports; never touches ClickHouse.
import type { AgentEvent } from "../../src/contracts";

export async function insertEvents(_rows: AgentEvent[]): Promise<void> {}
export async function insertRows(_table: string, _rows: Record<string, unknown>[]): Promise<void> {}
export async function timedQuery<T>(_query: string, _params: Record<string, unknown> = {}) {
  return { rows: [] as T[], elapsedMs: 0, rowsRead: 0 };
}
