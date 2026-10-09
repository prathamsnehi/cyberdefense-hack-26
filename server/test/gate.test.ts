import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attack, Finding, GateInput } from "../src/contracts";

vi.mock("../src/scan", () => ({ scan: vi.fn() }));
vi.mock("../src/redteam", () => ({ runBatch: vi.fn(), runHappyPath: vi.fn() }));
vi.mock("../src/sandbox/manager", () => ({ startVersion: vi.fn(), stopVersion: vi.fn() }));

import { decide, runGate } from "../src/gate";
import { runBatch, runHappyPath } from "../src/redteam";
import { startVersion, stopVersion } from "../src/sandbox/manager";
import { scan } from "../src/scan";

const base: GateInput = { version: "v2", semgrep_errors: 0, happy_path_ok: true, attacks_total: 30,
  attacks_succeeded: 0, failed_attack_ids: [], infra_errors: 0 };

// AWS-27 Scenario: accepted only when every check passes
describe("decide", () => {
  it("accepts only when semgrep is clean, legit invoices still pay, and every attack fails", () => {
    const v = decide(base);
    expect(v.accepted).toBe(true);
    expect(v).toEqual({ ...base, accepted: true });
  });

  // AWS-27 Scenario Outline: rejected when a check fails
  it.each<[string, Partial<GateInput>]>([
    ["semgrep_errors = 1 (semgrep still reports errors)", { semgrep_errors: 1 }],
    ["happy_path_ok = false (a fix that breaks legitimate payments)", { happy_path_ok: false }],
    ["attacks_succeeded = 1 (an attack still works)", { attacks_succeeded: 1, failed_attack_ids: ["a"] }],
    ["infra_errors = 1 (a dead runner is not a blocked attack)", { infra_errors: 1 }],
    ["attacks_total = 0 (an empty attack run)", { attacks_total: 0 }],
  ])("rejects when %s", (_name, override) => {
    expect(decide({ ...base, ...override }).accepted).toBe(false);
  });
});

const attack = (id: string): Attack => ({ id, technique: "bank-details-change",
  email: { id, from: "x@y.z", subject: "s", body: "b", external: true } as Attack["email"] });
const finding = (severity: Finding["severity"]): Finding => ({ id: severity, rule_id: "r", file: "f", line: 1,
  end_line: 1, severity, message: "m", snippet: "" });

describe("runGate", () => {
  const corpus = [attack("a1"), attack("a2"), attack("a3")];
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(scan).mockResolvedValue([finding("WARNING")]);
    vi.mocked(startVersion).mockResolvedValue("http://localhost:4100");
    vi.mocked(runHappyPath).mockResolvedValue(true);
    vi.mocked(runBatch).mockResolvedValue({ infra_errors: 0, results: corpus.map((a) => ({
      attack_id: a.id, technique: a.technique, version: "v2", success: false })) });
  });

  it("accepts a clean version, runs the sandbox with the guard off, and stops it", async () => {
    const v = await runGate("run1", "invoice-bot", "v2", "/tmp/v2/agent.ts", corpus);
    expect(v).toEqual({ ...base, attacks_total: 3, accepted: true });
    expect(scan).toHaveBeenCalledWith("/tmp/v2/agent.ts");
    expect(startVersion).toHaveBeenCalledWith("invoice-bot", "v2", "/tmp/v2/agent.ts", false);
    expect(runHappyPath).toHaveBeenCalledWith("http://localhost:4100", "invoice-bot");
    expect(runBatch).toHaveBeenCalledWith("http://localhost:4100", "run1", "invoice-bot", "v2", corpus);
    expect(stopVersion).toHaveBeenCalledWith("invoice-bot", "v2");
  });

  it("counts only ERROR findings and reports the attacks that still work", async () => {
    vi.mocked(scan).mockResolvedValue([finding("ERROR"), finding("WARNING"), finding("ERROR")]);
    vi.mocked(runBatch).mockResolvedValue({ infra_errors: 2, results: corpus.map((a, i) => ({
      attack_id: a.id, technique: a.technique, version: "v2", success: i !== 1 })) });
    const v = await runGate("run1", "invoice-bot", "v2", "f.ts", corpus);
    expect(v).toMatchObject({ semgrep_errors: 2, attacks_total: 3, attacks_succeeded: 2,
      failed_attack_ids: ["a1", "a3"], infra_errors: 2, accepted: false });
  });

  it("rejects when the happy path fails", async () => {
    vi.mocked(runHappyPath).mockResolvedValue(false);
    expect((await runGate("run1", "invoice-bot", "v2", "f.ts", corpus)).accepted).toBe(false);
  });

  it("always stops the version, even when the happy path throws", async () => {
    vi.mocked(runHappyPath).mockRejectedValue(new Error("boom"));
    await expect(runGate("run1", "invoice-bot", "v2", "f.ts", corpus)).rejects.toThrow("boom");
    expect(stopVersion).toHaveBeenCalledWith("invoice-bot", "v2");
    expect(runBatch).not.toHaveBeenCalled();
  });

  it("always stops the version, even when the attack batch throws", async () => {
    vi.mocked(runBatch).mockRejectedValue(new Error("clickhouse down"));
    await expect(runGate("run1", "invoice-bot", "v2", "f.ts", corpus)).rejects.toThrow("clickhouse down");
    expect(stopVersion).toHaveBeenCalledTimes(1);
  });
});
