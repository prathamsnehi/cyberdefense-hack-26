export type RecordData = Record<string, unknown>;
export type Metrics = {
  events_per_sec?: number | null;
  total_events?: number | null;
  blocked_24h?: number | null;
  findings?: number | null;
  rules_learned?: number | null;
  guard_p95_ms?: number | null;
};
export type QueryResult = { rows: RecordData[]; elapsedMs?: number; rowsRead?: number };

export function isRecord(value: unknown): value is RecordData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const value: unknown = await response.json();
  if (!isRecord(value)) throw new Error('The server returned an invalid response.');
  const endpoint = path.split('?')[0];
  if (endpoint === '/loop/active' && value.run_id !== null && (typeof value.run_id !== 'string' || !value.run_id)) {
    throw new Error('The server returned an invalid active-run response.');
  }
  if ((endpoint === '/events/blocked' || endpoint === '/fleet/hunt') && (!Array.isArray(value.rows) || !value.rows.every(isRecord))) {
    throw new Error('The server returned invalid query rows.');
  }
  return value as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return 'Unavailable';
  return JSON.stringify(value) ?? 'Unavailable';
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
