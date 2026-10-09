import { bus } from './bus';
import type { LoopEvent } from './contracts';
export type Envelope = { id: number; event: LoopEvent };

/** Subscribe before snapshotting; IDs are run-local history ordinals. */
export function subscribeRun(run_id: string, after: number, receive: (entry: Envelope) => void) {
  const off = bus.on(run_id, event => receive({ id: bus.history(run_id).length, event }));
  const history = bus.history(run_id);
  if (!bus.has(run_id) || after > history.length) { off(); throw new Error('Run history unavailable'); }
  return { off, replay: history.map((event, i) => ({ id: i + 1, event })).filter(e => e.id > after),
    terminal: ['done', 'error'].includes(history.at(-1)?.step ?? '') };
}
