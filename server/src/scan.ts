import { execa } from "execa";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env, ROOT } from "./env";
import type { Finding } from "./contracts";

type SemgrepResult = { check_id: string; path: string; start: { line: number }; end: { line: number };
  extra: { message: string; severity: string } };

export function parseSemgrep(stdout: string): Omit<Finding, "snippet">[] {
  let parsed: { results?: SemgrepResult[]; errors?: unknown[] };
  try { parsed = JSON.parse(stdout); } catch { throw new Error('Invalid Semgrep JSON output'); }
  if (!parsed || !Array.isArray(parsed.results) || (parsed.errors?.length ?? 0) > 0) throw new Error('Semgrep scan failed or returned incomplete results');
  return parsed.results.map((r) => ({
    id: `${r.check_id}:${r.path}:${r.start.line}`, rule_id: r.check_id, file: r.path,
    line: r.start.line, end_line: r.end.line,
    severity: (["ERROR", "WARNING", "INFO"].includes(r.extra.severity) ? r.extra.severity : "WARNING") as Finding["severity"],
    message: r.extra.message,
  }));
}

// Semgrep's `extra.lines` says "requires login" when logged out, so read the snippet ourselves.
async function snippetOf(file: string, start: number, end: number) {
  const lines = (await readFile(resolve(ROOT, file), "utf8")).split("\n");
  return lines.slice(Math.max(0, start - 3), end + 2).join("\n");
}

// Built at call time: rules/learned/ is empty until the first Learn step, and Semgrep errors on an empty
// config dir. Listing the files (instead of passing the directory) sidesteps that.
export const rulesets = () => [
  resolve(ROOT, "rules/agent-security.yaml"),
  ...readdirSync(resolve(ROOT, "rules/learned")).filter((f) => f.endsWith(".yaml")).map((f) => resolve(ROOT, "rules/learned", f)),
];

export async function scan(target: string, configs: string[] = rulesets()): Promise<Finding[]> {
  const args = ["scan", ...configs.flatMap((c) => ["--config", c]), "--json", "--metrics=off", "--quiet",
    "--no-git-ignore", target];
  const { stdout } = await execa(env.SEMGREP_BIN, args, { cwd: ROOT });
  return Promise.all(parseSemgrep(stdout).map(async (f) => ({ ...f, snippet: await snippetOf(f.file, f.line, f.end_line) })));
}
