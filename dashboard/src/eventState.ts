import { isRecord, numberValue, type RecordData } from './api';

export type RunEvent = { id: string; run_id: string; step: string; ts: string; data: RecordData };
export type Evaluation = {
  version: string;
  total?: number;
  succeeded?: number;
  infraErrors?: number;
  happyPath?: boolean;
  accepted?: boolean;
  final: boolean;
};
export type EventState = { events: RunEvent[]; seen: Set<string>; evaluations: Record<string, Evaluation> };
export const initialEventState = (): EventState => ({ events: [], seen: new Set(), evaluations: {} });

export function parseRunEvent(id: string, raw: string, runId: string): RunEvent | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (!id || !isRecord(value) || value.run_id !== runId || typeof value.step !== 'string') return undefined;
    return { id, run_id: runId, step: value.step, ts: typeof value.ts === 'string' ? value.ts : '', data: isRecord(value.data) ? value.data : { value: value.data } };
  } catch {
    return undefined;
  }
}

export function addRunEvent(state: EventState, event: RunEvent): EventState {
  if (state.seen.has(event.id)) return state;
  const seen = new Set(state.seen).add(event.id);
  let evaluations = state.evaluations;
  if (event.step === 'attack_batch' || event.step === 'verdict') {
    const data = event.data;
    const version = typeof data.version === 'string' || typeof data.version === 'number' ? String(data.version) : 'Unversioned';
    const previous = evaluations[version];
    // A replay can arrive after a verdict; it must not replace the final result.
    if (event.step === 'verdict' || !previous?.final) {
      const final = event.step === 'verdict';
      evaluations = {
        ...evaluations,
        [version]: {
          version,
          total: numberValue(final ? data.attacks_total : data.total),
          succeeded: numberValue(final ? data.attacks_succeeded : data.succeeded),
          infraErrors: numberValue(data.infra_errors),
          happyPath: typeof data.happy_path_ok === 'boolean' ? data.happy_path_ok : undefined,
          accepted: typeof data.accepted === 'boolean' ? data.accepted : undefined,
          final,
        },
      };
    }
  }
  return { seen, evaluations, events: [...state.events, event].slice(-300) };
}
