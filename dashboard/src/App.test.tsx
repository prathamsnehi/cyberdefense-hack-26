import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { usePolling } from './hooks';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) { MockEventSource.instances.push(this); }
  emit(id: string, step: string, data: Record<string, unknown> = {}) {
    this.onmessage?.({ lastEventId: id, data: JSON.stringify({ run_id: 'run-1', step, ts: '2026-10-09T12:00:00Z', data }) } as MessageEvent);
  }
}

function response(data: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => data } as Response;
}

const metrics = { events_per_sec: 12, total_events: 420, blocked_24h: 8, findings: 3, rules_learned: 2, guard_p95_ms: null };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  MockEventSource.instances = [];
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/metrics') return response(metrics);
    if (url === '/api/loop/start') return response({ run_id: 'run-1' });
    return response({ rows: [], rowsRead: 32, elapsedMs: 4 });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function startRun() {
  fireEvent.click(screen.getByRole('button', { name: /run defense loop/i }));
  await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
  return MockEventSource.instances[0];
}

describe('Albert AI dashboard', () => {
  it('renders telemetry and marks a missing latency unavailable', async () => {
    render(<App />);
    await screen.findByText('420');
    const latency = screen.getByText('Guard p95').closest('article')!;
    expect(within(latency).getByText('Unavailable')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/fleet/hunt')).toBe(false);
  });

  it('prevents duplicate starts while the start request is unresolved', async () => {
    let resolveStart!: (value: Response) => void;
    fetchMock.mockImplementation((url: string) => url === '/api/loop/start' ? new Promise<Response>((resolve) => { resolveStart = resolve; }) : Promise.resolve(response(url === '/api/metrics' ? metrics : { rows: [] })));
    render(<App />);
    const button = screen.getByRole('button', { name: /run defense loop/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/loop/start')).toHaveLength(1);
    await act(async () => { resolveStart(response({ run_id: 'run-1' })); });
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled();
  });

  it('renders untrusted event text safely and does not double count replay', async () => {
    render(<App />);
    const source = await startRun();
    act(() => {
      source.emit('1', 'attack_batch', { version: 'v1', total: 10, succeeded: 2, infra_errors: 1 });
      source.emit('1', 'attack_batch', { version: 'v1', total: 10, succeeded: 2, infra_errors: 1 });
      source.emit('2', 'attack_batch', { version: 'v1', total: 10, succeeded: 2, infra_errors: 1 });
      source.emit('3', 'analysis', { model: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' });
    });
    const table = screen.getByRole('table');
    const row = within(table).getByText('v1').closest('tr')!;
    expect(within(row).getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Run events' }).children).toHaveLength(3);
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('closes on done, re-enables starting, and resets the next run', async () => {
    render(<App />);
    const source = await startRun();
    act(() => {
      source.emit('1', 'verdict', { version: 'v1', attacks_total: 8, attacks_succeeded: 0, infra_errors: 0, happy_path_ok: true, accepted: true });
      source.emit('2', 'done');
    });
    expect(source.close).toHaveBeenCalledOnce();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run defense loop/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /run defense loop/i }));
    expect(within(screen.getByRole('table')).queryByText('v1')).toBeNull();
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(2));
    act(() => MockEventSource.instances[1].emit('1', 'attack_batch', { version: 'v2', total: 4, succeeded: 1, infra_errors: 0 }));
    expect(within(screen.getByRole('table')).getByText('v2')).toBeInTheDocument();
  });

  it('closes and recovers from terminal error events', async () => {
    render(<App />);
    const source = await startRun();
    act(() => source.emit('1', 'error', { message: 'Evaluation service unavailable' }));
    expect(source.close).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Evaluation service unavailable');
    expect(screen.getByRole('button', { name: /run defense loop/i })).toBeEnabled();
  });

  it('surfaces a start request failure and enables retry', async () => {
    fetchMock.mockImplementation(async (url: string) => response(url === '/api/metrics' ? metrics : { rows: [] }, url !== '/api/loop/start', url === '/api/loop/start' ? 503 : 200));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /run defense loop/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('503');
    expect(screen.getByRole('button', { name: /run defense loop/i })).toBeEnabled();
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('closes an interrupted SSE connection and enables retry', async () => {
    render(<App />);
    const source = await startRun();
    act(() => source.onerror?.());
    expect(source.close).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('connection was interrupted');
    expect(screen.getByRole('button', { name: /run defense loop/i })).toBeEnabled();
  });

  it('queries the fleet manually and displays real query statistics', async () => {
    fetchMock.mockImplementation(async (url: string) => response(url === '/api/metrics' ? metrics : url === '/api/fleet/hunt' ? { rows: [{ database: 'fleet-db', host: 'agent-7', finding: 'Database match' }], rowsRead: 716, elapsedMs: 13.2 } : { rows: [], rowsRead: 4, elapsedMs: 1 }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /refresh hunt/i }));
    expect(await screen.findByText('fleet-db')).toBeInTheDocument();
    expect(screen.getByText('716 rows scanned · 13.2 ms')).toBeInTheDocument();
  });
});

describe('poll scheduling', () => {
  it('waits for a pending request and schedules the next call after completion', async () => {
    vi.useFakeTimers();
    let resolveRequest!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    const hook = renderHook(() => usePolling('/metrics'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { resolveRequest(response(metrics)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    hook.unmount();
  });
});
