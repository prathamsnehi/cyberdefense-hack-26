import { describe, expect, it } from 'vitest';
import { safeUrl } from './api';
import { addRunEvent, initialEventState, parseRunEvent, type RunEvent } from './eventState';

function event(id: string, step: string, data: Record<string, unknown> = {}): RunEvent {
  return { id, run_id: 'run-1', step, ts: '2026-10-09T12:00:00Z', data };
}

describe('run event state', () => {
  it('ignores malformed, unnumbered, and foreign-run events', () => {
    expect(parseRunEvent('1', '{', 'run-1')).toBeUndefined();
    expect(parseRunEvent('', JSON.stringify(event('1', 'done')), 'run-1')).toBeUndefined();
    expect(parseRunEvent('1', JSON.stringify(event('1', 'done')), 'other-run')).toBeUndefined();
  });

  it('deduplicates event IDs and replaces evaluation totals by version', () => {
    const batch = event('1', 'attack_batch', { version: 'v1', total: 10, succeeded: 3, infra_errors: 1 });
    const first = addRunEvent(initialEventState(), batch);
    expect(addRunEvent(first, batch)).toBe(first);
    const replay = addRunEvent(first, { ...batch, id: '2' });
    expect(replay.evaluations.v1.total).toBe(10);
    expect(replay.evaluations.v1.succeeded).toBe(3);
    expect(replay.events).toHaveLength(2);
  });

  it('keeps the final verdict across delayed batch replay', () => {
    const verdict = event('1', 'verdict', { version: 'v2', attacks_total: 12, attacks_succeeded: 0, infra_errors: 0, happy_path_ok: true, accepted: true });
    const state = addRunEvent(initialEventState(), verdict);
    const replayed = addRunEvent(state, event('2', 'attack_batch', { version: 'v2', total: 12, succeeded: 7, infra_errors: 0 }));
    expect(replayed.evaluations.v2).toMatchObject({ total: 12, succeeded: 0, happyPath: true, accepted: true, final: true });
  });

  it('preserves unavailable values rather than inventing zeroes', () => {
    const state = addRunEvent(initialEventState(), event('1', 'verdict', { version: 'v1' }));
    expect(state.evaluations.v1.total).toBeUndefined();
    expect(state.evaluations.v1.infraErrors).toBeUndefined();
  });

  it('only links absolute HTTP and HTTPS URLs', () => {
    expect(safeUrl('https://example.com/report')).toBe('https://example.com/report');
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeUrl('/relative')).toBeUndefined();
  });
});
