import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// AC: GITHUB_TOKEN empty, GITHUB_REPO empty, AGENT_RUNTIME=local. Set before env.ts is imported.
const h = vi.hoisted(() => {
  process.env.GITHUB_TOKEN = "";
  process.env.GITHUB_REPO = "";
  process.env.AGENT_RUNTIME = "local";
  return { root: "" };
});

vi.mock("../src/env", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/env")>();
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  h.root = mkdtempSync(join(tmpdir(), "agentguard-loop-"));
  return { ...real, ROOT: h.root };
});

const attacks = [
  { id: "a1", technique: "bank-details-change", email: { id: "e1", from: "x", subject: "s", body: "b", external: true } },
  { id: "a2", technique: "instruction-override", email: { id: "e2", from: "y", subject: "s", body: "b", external: true } },
];
const finding = (file: string) => ({ id: `r:${file}:3`, rule_id: "agentguard.model-chosen-payee", file, line: 3, end_line: 3,
  severity: "ERROR" as const, message: "m", snippet: "ctx.tools.payInvoice(args)" });
const verdict = (version: string, accepted: boolean) => ({ version, semgrep_errors: 0, happy_path_ok: true, attacks_total: 2,
  attacks_succeeded: accepted ? 0 : 1, failed_attack_ids: accepted ? [] : ["a1"], infra_errors: 0, accepted });

const m = vi.hoisted(() => ({
  scan: vi.fn(), runGate: vi.fn(), learnRule: vi.fn(), runBatch: vi.fn(), startVersion: vi.fn(), stopVersion: vi.fn(),
  buildCorpus: vi.fn(), getPatch: vi.fn(), insertRows: vi.fn(), addLesson: vi.fn(), searchLessons: vi.fn(),
  proposePatchLocal: vi.fn(),
}));
vi.mock("../src/scan", () => ({ scan: m.scan }));
vi.mock("../src/gate", () => ({ runGate: m.runGate }));
vi.mock("../src/learn", () => ({ learnRule: m.learnRule }));
vi.mock("../src/redteam", () => ({ runBatch: m.runBatch, buildCorpusLocal: vi.fn() }));
vi.mock("../src/sandbox/manager", () => ({ startVersion: m.startVersion, stopVersion: m.stopVersion }));
vi.mock("../src/runtime", () => ({ buildCorpus: m.buildCorpus, getPatch: m.getPatch }));
vi.mock("../src/clickhouse", () => ({ insertRows: m.insertRows }));
vi.mock("../src/senso", () => ({ addLesson: m.addLesson, searchLessons: m.searchLessons }));
vi.mock("../src/fixer", () => ({ proposePatchLocal: m.proposePatchLocal }));

const { runLoop } = await import("../src/loop");
const { bus } = await import("../src/bus");

const steps = (run_id: string) => bus.history(run_id).map((e) => e.step);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  mkdirSync(join(h.root, "targets/invoice-bot"), { recursive: true });
  writeFileSync(join(h.root, "targets/invoice-bot/agent.ts"), "// v1 vulnerable\n");
  rmSync(join(h.root, "targets/invoice-bot/agent.fixed.ts"), { force: true });
  m.scan.mockImplementation(async (target: string) => target.endsWith("agent.ts")
    ? [finding("targets/invoice-bot/agent.ts")]
    : [finding(`${h.root}/targets/invoice-bot/agent.ts`), finding(`${h.root}/targets/refund-bot/agent.ts`)]);
  m.insertRows.mockResolvedValue(undefined);
  m.startVersion.mockResolvedValue("http://localhost:1");
  m.stopVersion.mockResolvedValue(undefined);
  m.buildCorpus.mockResolvedValue(attacks);
  m.runBatch.mockResolvedValue({ infra_errors: 0, results: [
    { attack_id: "a1", technique: "bank-details-change", version: "v1", success: true },
    { attack_id: "a2", technique: "instruction-override", version: "v1", success: false }] });
  m.searchLessons.mockResolvedValue("(senso disabled)");
  m.getPatch.mockImplementation(async (i: { version: string }) => ({ file_content: `// fixed ${i.version}\n`, rationale: "allowlist payees", citations: ["payee-allowlist"] }));
  m.runGate.mockImplementation(async (_r: string, _a: string, version: string) => verdict(version, true));
  m.learnRule.mockResolvedValue({ path: "/rules/learned/money-sink.yaml", rule_id: "agentguard.learned.money-sink", fallback: true });
  m.addLesson.mockResolvedValue(undefined);
});

afterAll(() => { rmSync(h.root, { recursive: true, force: true }); });

describe("AWS-29 loop orchestrator", () => {
  it("Scenario: a local loop run with GitHub disabled emits every step in order", async () => {
    await runLoop("run-ok", "invoice-bot");
    expect(steps("run-ok")).toEqual(["scan", "finding", "attack_batch", "patch", "verdict", "pr", "rule", "sweep", "issue", "lesson", "done"]);
    const ev = Object.fromEntries(bus.history("run-ok").map((e) => [e.step, e.data]));
    expect(ev.pr).toEqual({ url: "(github disabled)" });
    expect(ev.issue).toEqual({ url: "(github disabled)" });
    expect(ev.scan).toEqual({ file: "targets/invoice-bot/agent.ts", total: 1 });
    expect(ev.attack_batch).toEqual({ version: "v1", total: 2, succeeded: 1, infra_errors: 0 });
    // The sweep excludes the agent that was just fixed.
    expect(ev.sweep).toEqual({ rule_id: "agentguard.learned.money-sink", findings: [{ file: `${h.root}/targets/refund-bot/agent.ts`, line: 3 }] });
    expect(m.stopVersion).toHaveBeenCalledWith("invoice-bot", "v1");
    expect(m.getPatch).toHaveBeenCalledWith(expect.objectContaining({ version: "v2", failedAttacks: [attacks[0]] }));
    expect(m.learnRule.mock.calls[0][4]).toEqual(attacks[0]);
    expect(m.insertRows).toHaveBeenCalledWith("findings", [expect.objectContaining({ run_id: "run-ok", origin: "learned" })]);
    expect(m.addLesson).toHaveBeenCalledOnce();
  });

  it("Scenario: a rejected patch is retried with the attacks that still work", async () => {
    m.runGate.mockImplementationOnce(async (_r: string, _a: string, v: string) => verdict(v, false));
    await runLoop("run-retry", "invoice-bot");
    expect(steps("run-retry").filter((s) => s === "patch" || s === "verdict")).toEqual(["patch", "verdict", "patch", "verdict"]);
    expect(m.getPatch).toHaveBeenLastCalledWith(expect.objectContaining({ version: "v3", code: "// fixed v2\n" }));
    expect(steps("run-retry").at(-1)).toBe("done");
  });

  it("Scenario: with no accepted fix and no reference fix the loop ends with an error after three attempts", async () => {
    m.runGate.mockImplementation(async (_r: string, _a: string, v: string) => verdict(v, false));
    await runLoop("run-fail", "invoice-bot");
    expect(m.getPatch).toHaveBeenCalledTimes(3);
    expect(steps("run-fail").at(-1)).toBe("error");
    expect(bus.history("run-fail").at(-1)?.data).toEqual({ message: "No fix passed the gate in 3 attempts" });
    expect(steps("run-fail")).not.toContain("pr");
  });

  it("Scenario: the hand-written reference fix is the fourth attempt when it exists", async () => {
    writeFileSync(join(h.root, "targets/invoice-bot/agent.fixed.ts"), "// reference\n");
    m.runGate.mockImplementation(async (_r: string, _a: string, v: string) => verdict(v, v === "v5"));
    await runLoop("run-ref", "invoice-bot");
    expect(m.getPatch).toHaveBeenCalledTimes(3);
    const patches = bus.history("run-ref").filter((e) => e.step === "patch");
    expect(patches.at(-1)?.data).toMatchObject({ version: "v5", rationale: expect.stringContaining("Reference fix") });
    expect(steps("run-ref").at(-1)).toBe("done");
  });

  it("Scenario: a collaborator failure becomes an error event, and v1 is still stopped", async () => {
    m.runBatch.mockRejectedValueOnce(new Error("runner died"));
    await runLoop("run-crash", "invoice-bot");
    expect(steps("run-crash")).toEqual(["scan", "finding", "error"]);
    expect(String(bus.history("run-crash").at(-1)?.data.message)).toContain("runner died");
    expect(m.stopVersion).toHaveBeenCalledWith("invoice-bot", "v1");
  });
});
