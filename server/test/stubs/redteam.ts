// Stub until WS-A's src/redteam.ts lands (same exports used by WS-B).
import type { Attack, AttackResult } from "../../src/contracts";

export type BatchOutcome = { results: AttackResult[]; infra_errors: number };
export const corpus = new Map<string, Attack[]>();
export async function runBatch(_url: string, _run_id: string, _agent_id: string, _version: string,
  _attacks: Attack[], _record = true): Promise<BatchOutcome> { throw new Error("redteam stub"); }
export async function runHappyPath(_url: string, _agent_id: string): Promise<boolean> { throw new Error("redteam stub"); }
export async function buildCorpusLocal(_run_id: string, _perTechnique = 3): Promise<Attack[]> { throw new Error("redteam stub"); }
