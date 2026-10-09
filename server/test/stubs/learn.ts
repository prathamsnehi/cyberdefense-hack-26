// Stub until WS-B's src/learn.ts (AWS-28) lands.
import type { Attack } from "../../src/contracts";

export async function learnRule(_vulnFile: string, _fixedFile: string, _vulnCode: string, _fixedCode: string, _attack?: Attack):
  Promise<{ path: string; rule_id: string; fallback: boolean }> { throw new Error("learn stub"); }
