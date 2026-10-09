import { execaSync } from "execa";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../src/env";
import { parseSemgrep, scan } from "../src/scan";

// AWS-24 Scenario: the parser maps Semgrep JSON to findings
describe("parseSemgrep", () => {
  it("maps semgrep json results to findings", () => {
    const stdout = JSON.stringify({ errors: [], results: [{
      check_id: "rules.agentguard.model-chosen-payee", path: "targets/invoice-bot/agent.ts",
      start: { line: 21, col: 5 }, end: { line: 21, col: 40 },
      extra: { message: "m", severity: "ERROR", lines: "requires login" } }] });
    expect(parseSemgrep(stdout)).toEqual([{
      id: "rules.agentguard.model-chosen-payee:targets/invoice-bot/agent.ts:21",
      rule_id: "rules.agentguard.model-chosen-payee", file: "targets/invoice-bot/agent.ts",
      line: 21, end_line: 21, severity: "ERROR", message: "m" }]);
  });
  it("rejects invalid or failed scans rather than treating them as clean", () => {
    for (const output of ['', 'not json', 'null', '{}', '{"results":[],"errors":[{"message":"bad configuration"}]}']) {
      expect(() => parseSemgrep(output)).toThrow();
    }
    expect(parseSemgrep('{"results":[],"errors":[]}')).toEqual([]);
  });
  it("downgrades unknown severities to WARNING", () => {
    const stdout = JSON.stringify({ results: [{ check_id: "r", path: "f.ts", start: { line: 1 }, end: { line: 2 },
      extra: { message: "m", severity: "EXPERIMENT" } }] });
    expect(parseSemgrep(stdout)[0].severity).toBe("WARNING");
  });
});

const hasSemgrep = (() => {
  try { execaSync(process.env.SEMGREP_BIN ?? "semgrep", ["--version"]); return true; } catch { return false; }
})();

// AWS-24 Scenario: a real scan finds model-chosen-payee (skipped when semgrep is not installed)
describe.skipIf(!hasSemgrep)("scan (integration, real semgrep)", () => {
  const rules = resolve(ROOT, "rules/agent-security.yaml");
  const target = ["targets/invoice-bot/agent.ts", "rules/agent-security.ts"].map((p) => resolve(ROOT, p)).find(existsSync);

  // Rules come from the sibling rules branch (AWS-20); skip until they are in the tree.
  it.skipIf(!existsSync(rules) || !target)("finds model-chosen-payee with the repo ruleset", async () => {
    const findings = await scan(target!, [rules]);
    const hit = findings.find((f) => f.rule_id.endsWith("agentguard.model-chosen-payee"));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe("ERROR");
    expect(hit!.snippet).toContain("payInvoice");
  }, 120_000);

  it("finds model-chosen-payee with a self-contained rule and fixture, and reads the snippet from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentguard-scan-"));
    writeFileSync(join(dir, "rule.yaml"), `rules:
  - id: agentguard.model-chosen-payee
    mode: taint
    languages: [typescript]
    severity: ERROR
    message: model-chosen payee
    pattern-sources:
      - pattern: JSON.parse($CALL.function.arguments)
    pattern-sanitizers:
      - pattern: requireKnownPayee(...)
    pattern-sinks:
      - patterns:
          - pattern: '$CTX.tools.payInvoice({..., account: $ACC, ...})'
          - focus-metavariable: $ACC
      - patterns:
          - pattern: $CTX.tools.payInvoice($ARGS)
          - pattern-not: '$CTX.tools.payInvoice({...})'
          - focus-metavariable: $ARGS
`);
    writeFileSync(join(dir, "agent.ts"), `export async function vulnerable(ctx: any, res: any) {
  for (const call of res.choices[0].message.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    await ctx.tools.payInvoice(args);
  }
}
export async function safe(ctx: any, res: any, requireKnownPayee: any) {
  for (const call of res.choices[0].message.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    await ctx.tools.payInvoice({ account: requireKnownPayee(String(args.account), ctx.knownPayees), amount_usd: 1 });
  }
}
`);
    const findings = await scan(join(dir, "agent.ts"), [join(dir, "rule.yaml")]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rule_id: expect.stringMatching(/agentguard\.model-chosen-payee$/), line: 4, severity: "ERROR" });
    expect(findings[0].snippet).toContain("ctx.tools.payInvoice(args)");
  }, 120_000);
});
