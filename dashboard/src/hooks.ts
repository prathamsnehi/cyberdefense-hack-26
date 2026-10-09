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
  const [state, setState] = useState(initialEventState);
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const busy = useRef(false);
  const source = useRef<EventSource | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  const seen = useRef(new Set<string>());
  useEffect(() => () => { generation.current++; source.current?.close(); controller.current?.abort(); }, []);

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const current = ++generation.current;
    source.current?.close();
    seen.current = new Set();
    setState(initialEventState());
    setRunId(undefined);
    setError(undefined);
    setStatus('starting');
    controller.current = new AbortController();
    try {
      const response = await fetch('/api/loop/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.current.signal });
      if (!response.ok) throw new Error(`Could not start the defense loop (${response.status}).`);
      const value: unknown = await response.json();
      if (!isRecord(value) || typeof value.run_id !== 'string' || !value.run_id) throw new Error('The server did not return a run ID.');
      if (generation.current !== current) return;
      const id = value.run_id;
      setRunId(id);
      setStatus('running');
      const events = new EventSource(`/api/loop/${encodeURIComponent(id)}/events`);
      source.current = events;
      events.onmessage = (message) => {
        if (generation.current !== current || !busy.current) return;
        const event = parseRunEvent(message.lastEventId, message.data, id);
        if (!event || seen.current.has(event.id)) return;
        seen.current.add(event.id);
        setState((previous) => addRunEvent(previous, event));
        if (event.step === 'done' || event.step === 'error') {
          events.close();
          busy.current = false;
          setStatus(event.step);
          if (event.step === 'error') setError(typeof event.data.message === 'string' ? event.data.message : 'The defense loop reported an error.');
        }
      };
      events.onerror = () => {
        if (generation.current !== current || !busy.current) return;
        events.close();
        busy.current = false;
        setStatus('error');
        setError('The live event connection was interrupted. Start a new run to reconnect.');
      };
    } catch (cause) {
      if (generation.current !== current) return;
      busy.current = false;
      setStatus('error');
      setError(errorMessage(cause));
    }
  }, []);
  return { ...state, status, error, runId, start, busy: status === 'starting' || status === 'running' };
}
