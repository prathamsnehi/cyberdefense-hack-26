import { EventEmitter } from "node:events";
import type { LoopEvent, LoopStep } from "./contracts";

const ee = new EventEmitter();
ee.setMaxListeners(100);
const log = new Map<string, LoopEvent[]>();

export const bus = {
  emit(run_id: string, step: LoopStep, data: Record<string, unknown> = {}) {
    const e: LoopEvent = { run_id, step, data, ts: new Date().toISOString() };
    log.set(run_id, [...(log.get(run_id) ?? []), e]);
    ee.emit(run_id, e);
    console.log(`[${run_id}] ${step}`, JSON.stringify(data).slice(0, 200));
  },
  history: (run_id: string) => log.get(run_id) ?? [],
  on(run_id: string, fn: (e: LoopEvent) => void) { ee.on(run_id, fn); return () => { ee.off(run_id, fn); }; },
};
