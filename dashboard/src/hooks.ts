import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, getJson, isRecord } from './api';
import { addRunEvent, initialEventState, parseRunEvent } from './eventState';

export function usePolling<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      try {
        const value = await getJson<T>(path, controller.signal);
        if (active) { setData(value); setError(undefined); }
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        // Schedule after completion so slow requests never overlap.
        if (active) timer = setTimeout(poll, 2_000);
      }
    }
    void poll();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [path]);
  return { data, error };
}

export function useManualQuery<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const busy = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const refresh = useCallback(async (parameters?: Record<string, string>) => {
    if (busy.current) return;
    busy.current = true;
    controller.current = new AbortController();
    setLoading(true);
    setError(undefined);
    try {
      const query = new URLSearchParams(Object.entries(parameters ?? {}).filter(([, value]) => value)).toString();
      setData(await getJson<T>(`${path}${query ? `?${query}` : ''}`, controller.current.signal));
    } catch (cause) {
      if (!controller.current.signal.aborted) setError(errorMessage(cause));
    } finally {
      busy.current = false;
      if (!controller.current.signal.aborted) setLoading(false);
    }
  }, [path]);
  return { data, error, loading, refresh };
}

export function useDefenseRun() {
  const active = usePolling<{ run_id: string | null }>('/loop/active');
  const [previousRun, setPreviousRun] = useState<string | undefined>(() => {
    try { return sessionStorage.getItem('albert-last-run') || undefined; } catch { return undefined; }
  });
  const [state, setState] = useState(initialEventState);
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const busy = useRef(false);
  const source = useRef<EventSource | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  const seen = useRef(new Set<string>());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearReconnectTimer = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    reconnectTimer.current = undefined;
  }, []);
  useEffect(() => () => {
    generation.current++;
    clearReconnectTimer();
    source.current?.close();
    controller.current?.abort();
  }, [clearReconnectTimer]);

  const begin = useCallback(async (resumeId?: string) => {
    if (busy.current) return;
    busy.current = true;
    const current = ++generation.current;
    clearReconnectTimer();
    source.current?.close();
    seen.current = new Set();
    setState(initialEventState());
    setRunId(undefined);
    setError(undefined);
    setStatus('starting');
    controller.current = new AbortController();
    try {
      let id = resumeId;
      if (!id) {
        const response = await fetch('/api/loop/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.current.signal });
        const value: unknown = await response.json().catch(() => undefined);
        // A different tab or teammate may already be running this agent. Attach to that run; never retry the POST.
        const activeRun = response.status === 409 && isRecord(value) && typeof value.run_id === 'string' && value.run_id;
        if (!response.ok && !activeRun) throw new Error(`Could not start the defense loop (${response.status}).`);
        if (!isRecord(value) || typeof value.run_id !== 'string' || !value.run_id) throw new Error('The server did not return a run ID.');
        id = value.run_id;
      }
      if (generation.current !== current) return;
      setRunId(id);
      setPreviousRun(id);
      try { sessionStorage.setItem('albert-last-run', id); } catch { /* Storage is optional; live observation still works. */ }
      setStatus('running');
      const events = new EventSource(`/api/loop/${encodeURIComponent(id)}/events`);
      source.current = events;
      const unavailable = (message: string) => {
        if (generation.current !== current || !busy.current) return;
        clearReconnectTimer();
        events.close();
        busy.current = false;
        setStatus('error');
        setError(message);
      };
      events.onopen = () => {
        if (generation.current !== current || !busy.current) return;
        clearReconnectTimer();
        setError(undefined);
      };
      events.onmessage = (message) => {
        if (generation.current !== current || !busy.current) return;
        const event = parseRunEvent(message.lastEventId, message.data, id);
        if (!event || seen.current.has(event.id)) return;
        seen.current.add(event.id);
        setState((previous) => addRunEvent(previous, event));
        if (event.step === 'done' || event.step === 'error') {
          clearReconnectTimer();
          events.close();
          busy.current = false;
          setStatus(event.step);
          setError(event.step === 'error' ? (typeof event.data.message === 'string' ? event.data.message : 'The defense loop reported an error.') : undefined);
        }
      };
      events.onerror = () => {
        if (generation.current !== current || !busy.current) return;
        if (events.readyState === EventSource.CLOSED) {
          unavailable('The live event stream is unavailable for this run. Start a new run to retry.');
          return;
        }
        // Keep this EventSource alive so the browser reconnects with Last-Event-ID.
        // Repeated failures share one grace period and never retry the start POST.
        setError('Live event stream interrupted. Reconnecting to the current run…');
        if (reconnectTimer.current === undefined) {
          reconnectTimer.current = setTimeout(() => {
            unavailable('The live event stream is unavailable after 30 seconds of reconnecting. Start a new run to retry.');
          }, 30_000);
        }
      };
    } catch (cause) {
      if (generation.current !== current) return;
      clearReconnectTimer();
      busy.current = false;
      setStatus('error');
      setError(errorMessage(cause));
    }
  }, [clearReconnectTimer]);
  const activeRun = typeof active.data?.run_id === 'string' && active.data.run_id ? active.data.run_id : undefined;
  const resumableRun = activeRun ?? previousRun;
  return { ...state, status, error, runId, activeRun, resumableRun, activeCheckError: active.error,
    start: () => begin(), observe: () => resumableRun ? begin(resumableRun) : Promise.resolve(),
    busy: status === 'starting' || status === 'running' };
}
