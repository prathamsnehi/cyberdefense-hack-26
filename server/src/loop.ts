import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { bus } from "./bus";
import { insertRows } from "./clickhouse";
import { ROOT } from "./env";
import { runGate } from "./gate";
import { openIssue, openPullRequest } from "./github";
import { learnRule } from "./learn";
import { runBatch } from "./redteam";
import { buildCorpus, getPatch } from "./runtime";
import { startVersion, stopVersion } from "./sandbox/manager";
import { scan } from "./scan";
import { addLesson, searchLessons } from "./senso";
import type { Attack, AttackResult, Finding } from "./contracts";

const rel = (p: string) => relative(ROOT, p).replaceAll("\\", "/");
const recordFindings = (run_id: string, fs: Finding[], origin: string) =>
  insertRows("findings", fs.map((f) => ({ run_id, rule_id: f.rule_id, file: f.file, line: f.line,
    severity: f.severity, message: f.message, origin })));

export async function runLoop(run_id: string, agent_id: string) {
  try {
    // 1. Detect
    const v1File = resolve(ROOT, "targets", agent_id, "agent.ts");
    const v1Code = await readFile(v1File, "utf8");
    const findings = await scan(v1File);
    await recordFindings(run_id, findings, "initial");
    bus.emit(run_id, "scan", { file: rel(v1File), total: findings.length });
    for (const f of findings) bus.emit(run_id, "finding", { rule_id: f.rule_id, file: f.file, line: f.line, severity: f.severity });

    // 2. Explore attacks on v1 (red-team agent), build the corpus, measure the baseline
    const url1 = await startVersion(agent_id, "v1", v1File, false);
    let corpus: Attack[];
    let base: AttackResult[];
    let baseInfra = 0;
    try {
      corpus = await buildCorpus(run_id, agent_id, url1);
      ({ results: base, infra_errors: baseInfra } = await runBatch(url1, run_id, agent_id, "v1", corpus));
    } finally { await stopVersion(agent_id, "v1"); }
    let failedIds = base.filter((r) => r.success).map((r) => r.attack_id);
    bus.emit(run_id, "attack_batch", { version: "v1", total: base.length, succeeded: failedIds.length, infra_errors: baseInfra });

    // 3. Fix + prove: three LLM attempts, then the hand-written reference fix if one exists (A1 Step 2b).
    let code = v1Code;
    let accepted: { version: string; file: string; rationale: string; citations: string[] } | null = null;
    const reference = resolve(ROOT, "targets", agent_id, "agent.fixed.ts");
    const maxAttempt = existsSync(reference) ? 5 : 4;
    for (let n = 2; n <= maxAttempt && !accepted; n++) {
      const version = `v${n}`;
      const lessons = await searchLessons("prompt injection payment agent untrusted email payee allowlist");
      const failedAttacks = corpus.filter((a) => failedIds.includes(a.id));
      const patch = n === 5
        ? { file_content: await readFile(reference, "utf8"), rationale: "Reference fix (hand-written fallback, labelled as such)", citations: [] as string[] }
        : await getPatch({ run_id, agent_id, version, code, findings, failedAttacks, lessons });
      const file = resolve(ROOT, "sandbox", `${run_id}-${version}`, "agent.ts");
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, patch.file_content);
      bus.emit(run_id, "patch", { version, rationale: patch.rationale, citations: patch.citations });
      const verdict = await runGate(run_id, agent_id, version, file, corpus);
      bus.emit(run_id, "verdict", verdict);
      if (verdict.accepted) accepted = { version, file, rationale: patch.rationale, citations: patch.citations };
      else { failedIds = verdict.failed_attack_ids; code = patch.file_content; }
    }
    if (!accepted) { bus.emit(run_id, "error", { message: `No fix passed the gate in ${maxAttempt - 1} attempts` }); return; }

    // 4a. Publish the proven fix
    const fixedCode = await readFile(accepted.file, "utf8");
    const pr = await openPullRequest({ path: `targets/${agent_id}/agent.ts`, content: fixedCode,
      title: `fix(${agent_id}): block attacker-chosen payees (AgentGuard ${run_id})`,
      body: `**Proven by AgentGuard.** ${base.filter((r) => r.success).length}/${base.length} attacks worked on v1; 0/${corpus.length} work on ${accepted.version}. Legitimate invoices still pay.\n\n${accepted.rationale}\n\nLessons: ${accepted.citations.join(", ")}` });
    bus.emit(run_id, "pr", { url: pr });

    // 4b. Learn a rule for the whole flaw class, then sweep every agent
    const firstAttack = corpus.find((a) => base.find((r) => r.attack_id === a.id && r.success));
    const rule = await learnRule(v1File, accepted.file, v1Code, fixedCode, firstAttack);
    bus.emit(run_id, "rule", rule);
    const sweep = (await scan(resolve(ROOT, "targets"), [rule.path])).filter((f) => !f.file.includes(`/${agent_id}/`));
    await recordFindings(run_id, sweep, "learned");
    bus.emit(run_id, "sweep", { rule_id: rule.rule_id, findings: sweep.map((f) => ({ file: f.file, line: f.line })) });
    for (const f of sweep) {
      const url = await openIssue(`AgentGuard: ${rule.rule_id} in ${f.file}:${f.line}`,
        `Same flaw class as ${pr}.\n\n\`\`\`ts\n${f.snippet}\n\`\`\`\n\n${f.message}`);
      bus.emit(run_id, "issue", { url });
    }

    // 4c. Remember the lesson (feeds the Prevent brief)
    await addLesson(`Lesson ${run_id}: ${rule.rule_id}`,
      `Flaw class: model-chosen destination reaches a money-moving tool. Attack that worked: ${firstAttack?.technique}. ` +
      `Fix that held against ${corpus.length} attacks: ${accepted.rationale}. Detect with Semgrep rule ${rule.rule_id}.`);
    bus.emit(run_id, "lesson", { title: `Lesson ${run_id}` });
    bus.emit(run_id, "done", {});
  } catch (e) {
    bus.emit(run_id, "error", { message: String(e) });
  }
}
