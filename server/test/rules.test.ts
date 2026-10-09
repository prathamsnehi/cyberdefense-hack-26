import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const SEMGREP = process.env.SEMGREP_BIN || "semgrep";
const hasSemgrep = spawnSync(SEMGREP, ["--version"]).status === 0;

const semgrepTest = (dir: string) =>
  spawnSync(SEMGREP, ["--test", "--metrics=off", dir], { cwd: ROOT, encoding: "utf8" });

function scan(config: string, target: string) {
  const out = execFileSync(SEMGREP, ["scan", "--config", config, "--json", "--metrics=off", "--quiet", "--no-git-ignore", target],
    { cwd: ROOT, encoding: "utf8" });
  return (JSON.parse(out).results as { check_id: string; path: string }[]).map((r) => ({ rule: r.check_id, path: r.path }));
}

// Same dispatch shape as the vulnerable fixture: one money tool called with raw model args, the rest dispatched by name.
const agent = (moneyTool: string) => `import type { AgentContext, Email } from "../../server/src/contracts";
const TOOL_DEFS: any[] = [];
export async function handleEmail(email: Email, ctx: AgentContext) {
  const res = await ctx.llm.chat.completions.create({ model: ctx.model, tools: TOOL_DEFS,
    messages: [{ role: "user", content: \`Subject: \${email.subject}\\n\\n\${email.body}\` }] });
  for (const call of res.choices[0].message.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    if (call.function.name === "${moneyTool}") await ctx.tools.${moneyTool}(args);
    else await ctx.tools[call.function.name](args);
  }
}
`;

// Real targets win once WS-A lands them; until then sweep a temp copy of the vulnerable shape.
const realTargets = ["invoice-bot", "refund-bot", "vendor-bot"].every((b) => existsSync(join(ROOT, "targets", b, "agent.ts")));
const tmp = mkdtempSync(join(tmpdir(), "agentguard-targets-"));
if (!realTargets) {
  for (const [bot, tool] of [["invoice-bot", "payInvoice"], ["refund-bot", "issueRefund"], ["vendor-bot", "updateBankDetails"]]) {
    mkdirSync(join(tmp, bot));
    writeFileSync(join(tmp, bot, "agent.ts"), agent(tool));
  }
}
const targets = realTargets ? join(ROOT, "targets") : tmp;
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe.skipIf(!hasSemgrep)("agent security semgrep rules", () => {
  it("semgrep --test rules/ passes with the expected findings and no false positives", () => {
    const r = semgrepTest("rules/");
    expect(r.stdout + r.stderr).toMatch(/All tests passed/);
    expect(r.status).toBe(0);
  }, 120_000);

  it("semgrep --test rules/fallback/ passes", () => {
    const r = semgrepTest("rules/fallback/");
    expect(r.stdout + r.stderr).toMatch(/All tests passed/);
    expect(r.status).toBe(0);
  }, 120_000);

  it("scanning targets/ flags model-chosen-payee in invoice-bot only, not refund-bot or vendor-bot", () => {
    const payee = scan("rules/agent-security.yaml", targets).filter((f) => f.rule.endsWith("agentguard.model-chosen-payee"));
    expect(payee.some((f) => f.path.includes("invoice-bot/"))).toBe(true);
    expect(payee.filter((f) => /(refund|vendor)-bot\//.test(f.path))).toEqual([]);
  }, 120_000);

  it("the fallback money-sink rule generalizes to refund-bot and vendor-bot", () => {
    const hits = scan("rules/fallback/money-sink.yaml", targets).filter((f) => f.rule.endsWith("agentguard.learned.money-sink"));
    for (const bot of ["invoice-bot", "refund-bot", "vendor-bot"]) expect(hits.some((f) => f.path.includes(`${bot}/`))).toBe(true);
  }, 120_000);
});
