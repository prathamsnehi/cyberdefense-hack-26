import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = mkdtempSync(join(tmpdir(), "agentguard-learn-"));
const chat = vi.fn();
const scan = vi.fn();
vi.mock("../src/env", async (orig) => ({ ...(await orig<any>()), ROOT: root }));
vi.mock("../src/llm", async (orig) => ({ ...(await orig<any>()), chat: (...a: unknown[]) => chat(...a) }));
vi.mock("../src/scan", () => ({ scan: (...a: unknown[]) => scan(...a) }));

const { learnRule } = await import("../src/learn");

const FALLBACK = "rules:\n  - id: agentguard.learned.money-sink\n";
const LEARNED = `rules:\n  - id: "agentguard.learned.pay-any-sink"\n    mode: taint\n`;
const hit = { id: "h", rule_id: "r", file: "f", line: 1, end_line: 1, severity: "ERROR", message: "m", snippet: "" };

beforeEach(() => {
  chat.mockReset(); scan.mockReset();
  rmSync(join(root, "rules/learned"), { recursive: true, force: true });
  mkdirSync(join(root, "rules/fallback"), { recursive: true });
  writeFileSync(join(root, "rules/fallback/money-sink.yaml"), FALLBACK);
});

describe("AWS-28 Scenario: learnRule returns a validated rule or fallback:true", () => {
  it("returns the LLM rule when it hits the vulnerable file and not the fixed one", async () => {
    chat.mockResolvedValue("```yaml\n" + LEARNED + "```");
    scan.mockImplementation(async (file: string) => (file === "vuln.ts" ? [hit] : []));
    const rule = await learnRule("vuln.ts", "fixed.ts", "v", "f");
    expect(rule).toEqual({ path: join(root, "rules/learned/agentguard.learned.pay-any-sink.yaml"),
      rule_id: "agentguard.learned.pay-any-sink", fallback: false });
    expect(readFileSync(rule.path, "utf8")).toBe(LEARNED);
    // candidate was validated from sandbox/, not loaded straight into rules/learned/
    expect(String(scan.mock.calls[0][1][0])).toContain(join(root, "sandbox/rule-candidate-"));
  });

  it("falls back after two candidates that also flag the fixed file", async () => {
    chat.mockResolvedValue("```yaml\n" + LEARNED + "```");
    scan.mockResolvedValue([hit]);
    const rule = await learnRule("vuln.ts", "fixed.ts", "v", "f");
    expect(rule).toEqual({ path: join(root, "rules/learned/money-sink.yaml"),
      rule_id: "agentguard.learned.money-sink", fallback: true });
    expect(chat).toHaveBeenCalledTimes(2);
    expect(existsSync(join(root, "rules/learned/agentguard.learned.pay-any-sink.yaml"))).toBe(false);
  });

  it("falls back when the rule misses the vulnerable file", async () => {
    chat.mockResolvedValue("```yaml\n" + LEARNED + "```");
    scan.mockResolvedValue([]);
    expect((await learnRule("vuln.ts", "fixed.ts", "v", "f")).fallback).toBe(true);
  });
});

describe("AWS-28 Scenario: learnRule LLM path falls back cleanly when the LLM throws (no key)", () => {
  it("copies the fallback money-sink rule and returns fallback:true", async () => {
    chat.mockRejectedValue(new Error("401 no api key"));
    const rule = await learnRule("vuln.ts", "fixed.ts", "v", "f");
    expect(rule.fallback).toBe(true);
    expect(rule.rule_id).toBe("agentguard.learned.money-sink");
    expect(readFileSync(rule.path, "utf8")).toBe(FALLBACK);
    expect(scan).not.toHaveBeenCalled();
  });

  it("falls back when the model returns no yaml block", async () => {
    chat.mockResolvedValue("I cannot help");
    expect((await learnRule("vuln.ts", "fixed.ts", "v", "f")).fallback).toBe(true);
  });
});
