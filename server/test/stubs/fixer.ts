// Stub until WS-B's src/fixer.ts (AWS-28) lands.
import type { Attack, Finding, Patch } from "../../src/contracts";

export async function proposePatchLocal(_input: { code: string; findings: Finding[]; failedAttacks: Attack[]; lessons: string }): Promise<Patch> {
  throw new Error("fixer stub");
}
