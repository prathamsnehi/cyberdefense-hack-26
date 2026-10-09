import { scan } from "./scan";
import { runBatch, runHappyPath } from "./redteam";
import { startVersion, stopVersion } from "./sandbox/manager";
import type { Attack, GateInput, GateVerdict } from "./contracts";

export function decide(v: GateInput): GateVerdict {
  return { ...v, accepted: v.semgrep_errors === 0 && v.happy_path_ok && v.attacks_total > 0
    && v.attacks_succeeded === 0 && v.infra_errors === 0 };
}

// Guard OFF: the gate measures the code fix, not the runtime guard.
export async function runGate(run_id: string, agent_id: string, version: string, file: string, corpus: Attack[]) {
  const findings = await scan(file);
  const url = await startVersion(agent_id, version, file, false);
  try {
    const happy_path_ok = await runHappyPath(url, agent_id);
    const { results, infra_errors } = await runBatch(url, run_id, agent_id, version, corpus);
    const failed = results.filter((r) => r.success);
    return decide({ version, semgrep_errors: findings.filter((f) => f.severity === "ERROR").length,
      happy_path_ok, attacks_total: results.length, attacks_succeeded: failed.length,
      failed_attack_ids: failed.map((r) => r.attack_id), infra_errors });
  } finally {
    await stopVersion(agent_id, version);
  }
}
