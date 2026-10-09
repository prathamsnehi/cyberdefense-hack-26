// Stub until WS-B's src/gate.ts (AWS-27) lands.
import type { Attack, GateInput, GateVerdict } from "../../src/contracts";

export function decide(v: GateInput): GateVerdict { return { ...v, accepted: false }; }
export async function runGate(_run_id: string, _agent_id: string, _version: string, _file: string, _corpus: Attack[]): Promise<GateVerdict> {
  throw new Error("gate stub");
}
