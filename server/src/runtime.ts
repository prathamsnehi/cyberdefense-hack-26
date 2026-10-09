// server/src/runtime.ts (stub until D3a lands; same exports, local only)
import { proposePatchLocal } from "./fixer";
import { buildCorpusLocal } from "./redteam";
import type { Attack, Finding } from "./contracts";

export type PatchInput = { run_id: string; agent_id: string; version: string; code: string;
  findings: Finding[]; failedAttacks: Attack[]; lessons: string };

export const buildCorpus = (run_id: string, _agent_id: string, _url?: string) => buildCorpusLocal(run_id);
export const getPatch = (input: PatchInput) => proposePatchLocal(input);
