import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useDefenseRun, usePolling } from './hooks';

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];
  readyState = MockEventSource.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => { this.readyState = MockEventSource.CLOSED; });
  constructor(public url: string) { MockEventSource.instances.push(this); }
  emit(id: string, step: string, data: Record<string, unknown> = {}, runId = 'run-1') {
    this.onmessage?.({ lastEventId: id, data: JSON.stringify({ run_id: runId, step, ts: '2026-10-09T12:00:00Z', data }) } as MessageEvent);
  }
  disconnect(permanent = false) {
    this.readyState = permanent ? MockEventSource.CLOSED : MockEventSource.CONNECTING;
    this.onerror?.();
  }
  reconnect() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
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

  it('closes an unavailable SSE stream immediately and enables retry', async () => {
    render(<App />);
    const source = await startRun();
    act(() => source.disconnect(true));
    expect(source.close).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('stream is unavailable');
    expect(screen.getByRole('button', { name: /run defense loop/i })).toBeEnabled();
  });

  it('queries the fleet manually and displays real query statistics', async () => {
    fetchMock.mockImplementation(async (url: string) => response(url === '/api/metrics' ? metrics : url === '/api/fleet/hunt' ? { rows: [{ database: 'fleet-db', host: 'agent-7', finding: 'Database match' }], rowsRead: 716, elapsedMs: 13.2 } : { rows: [], rowsRead: 4, elapsedMs: 1 }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /refresh hunt/i }));
    const huntPanel = screen.getByRole('heading', { name: 'Agent fleet hunt' }).closest('section')!;
    await waitFor(() => expect(huntPanel.querySelector('summary')).toHaveTextContent('fleet-db'));
    expect(screen.getByText('716 rows scanned · 13.2 ms')).toBeInTheDocument();
  });

  it('encodes the optional fleet agent filter and uses query metadata from the backend', async () => {
    fetchMock.mockImplementation(async (url: string) => response(url === '/api/metrics' ? metrics : url.startsWith('/api/fleet/hunt') ? { rows: [], rowsRead: 103, elapsedMs: 6.7 } : { rows: [], rowsRead: 4, elapsedMs: 1 }));
    render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter fleet hunt by agent' }), { target: { value: '  agent-7 & branch  ' } });
    fireEvent.click(screen.getByRole('button', { name: /refresh hunt/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/fleet/hunt?agent=agent-7+%26+branch')).toBe(true));
    expect(await screen.findByText('103 rows scanned · 6.7 ms')).toBeInTheDocument();
    expect(screen.getByText('No suspicious payment events found.')).toBeInTheDocument();
  });

  it('does not invent statistics when a fleet query omits them', async () => {
    fetchMock.mockImplementation(async (url: string) => response(url === '/api/metrics' ? metrics : { rows: [] }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /refresh hunt/i }));
    const huntPanel = screen.getByRole('heading', { name: 'Agent fleet hunt' }).closest('section')!;
    expect(await within(huntPanel).findByText('Unavailable rows scanned · Unavailable ms')).toBeInTheDocument();
    expect(within(huntPanel).queryByText('0 rows scanned · 0 ms')).toBeNull();
  });
});

describe('SSE reconnect lifecycle', () => {
  it('keeps the original stream and start POST while reconnecting, then deduplicates replay', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDefenseRun());
    await act(async () => { await hook.result.current.start(); });
    const source = MockEventSource.instances[0];
    act(() => source.emit('1', 'attack_batch', { version: 'v1', total: 10, succeeded: 2, infra_errors: 0 }));
    act(() => source.disconnect());
    expect(hook.result.current.busy).toBe(true);
    expect(hook.result.current.error).toContain('Reconnecting to the current run');
    expect(source.close).not.toHaveBeenCalled();
    await act(async () => { await hook.result.current.start(); });
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/loop/start')).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    act(() => {
      source.reconnect();
      source.emit('1', 'attack_batch', { version: 'v1', total: 10, succeeded: 2, infra_errors: 0 });
      source.emit('2', 'verdict', { version: 'v1', attacks_total: 10, attacks_succeeded: 1, infra_errors: 0, happy_path_ok: true, accepted: true });
    });
    expect(hook.result.current.events).toHaveLength(2);
    expect(hook.result.current.evaluations.v1).toMatchObject({ total: 10, succeeded: 1, accepted: true });
    expect(hook.result.current.error).toBeUndefined();
    expect(MockEventSource.instances).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(hook.result.current.busy).toBe(true);
    expect(source.close).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('bounds repeated reconnect failures to one 30-second grace period', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDefenseRun());
    await act(async () => { await hook.result.current.start(); });
    const source = MockEventSource.instances[0];
    act(() => source.disconnect());
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    act(() => source.disconnect());
    await act(async () => { await vi.advanceTimersByTimeAsync(9_999); });
    expect(hook.result.current.busy).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(hook.result.current.status).toBe('error');
    expect(hook.result.current.busy).toBe(false);
    expect(hook.result.current.error).toContain('unavailable after 30 seconds');
    expect(source.close).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/loop/start')).toHaveLength(1);
    hook.unmount();
  });

  it('isolates two runs, reuses IDs safely, and clears the first run reconnect timer on done', async () => {
    vi.useFakeTimers();
    let nextRun = 0;
    fetchMock.mockImplementation(async () => response({ run_id: `run-${++nextRun}` }));
    const hook = renderHook(() => useDefenseRun());
    await act(async () => { await hook.result.current.start(); });
    const first = MockEventSource.instances[0];
    act(() => {
      first.emit('1', 'verdict', { version: 'old', attacks_total: 8, attacks_succeeded: 0, infra_errors: 0, happy_path_ok: true, accepted: true });
      first.disconnect();
      first.emit('2', 'done');
    });
    expect(hook.result.current.error).toBeUndefined();
    expect(hook.result.current.busy).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { await hook.result.current.start(); });
    const second = MockEventSource.instances[1];
    expect(hook.result.current.runId).toBe('run-2');
    expect(hook.result.current.events).toHaveLength(0);
    expect(hook.result.current.evaluations).toEqual({});
    act(() => {
      first.emit('3', 'error', { message: 'Late old stream error' });
      first.reconnect();
      second.emit('1', 'attack_batch', { version: 'foreign', total: 5, succeeded: 5, infra_errors: 0 }, 'run-1');
      second.emit('1', 'attack_batch', { version: 'new', total: 5, succeeded: 1, infra_errors: 0 }, 'run-2');
    });
    expect(hook.result.current.events).toHaveLength(1);
    expect(hook.result.current.evaluations.new).toMatchObject({ total: 5, succeeded: 1 });
    expect(hook.result.current.evaluations.old).toBeUndefined();
    expect(hook.result.current.evaluations.foreign).toBeUndefined();
    expect(hook.result.current.error).toBeUndefined();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(hook.result.current.busy).toBe(true);
    expect(second.close).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/loop/start')).toHaveLength(2);
    hook.unmount();
  });

  it('clears pending reconnect timers when the stream closes permanently', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDefenseRun());
    await act(async () => { await hook.result.current.start(); });
    const source = MockEventSource.instances[0];
    act(() => source.disconnect());
    expect(vi.getTimerCount()).toBe(1);
    act(() => source.disconnect(true));
    expect(vi.getTimerCount()).toBe(0);
    expect(hook.result.current.busy).toBe(false);
    expect(hook.result.current.error).toContain('unavailable for this run');
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(source.close).toHaveBeenCalledOnce();
    hook.unmount();
  });

  it('clears pending reconnect timers and closes the source on unmount', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDefenseRun());
    await act(async () => { await hook.result.current.start(); });
    const source = MockEventSource.instances[0];
    act(() => source.disconnect());
    expect(vi.getTimerCount()).toBe(1);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(source.close).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(source.close).toHaveBeenCalledOnce();
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
