import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ROOT } from "./env";
import { chat, extractFence, MODELS, openai } from "./llm";
import { scan } from "./scan";
import type { Attack } from "./contracts";

const RULE_WRITER_SYSTEM = `You write Semgrep rules (YAML) for TypeScript. Given a vulnerable agent, its fixed
version and an attack that worked, write ONE taint-mode rule with id "agentguard.learned.<short-name>" that
catches the whole flaw class, not just this file: model-chosen destinations flowing from
JSON.parse($CALL.function.arguments) into ANY money-moving tool on ctx.tools (pay, refund, transfer, bank...).
Treat requireKnownPayee(...) as a sanitizer. Return only a \`\`\`yaml block.`;

export type LearnedRule = { path: string; rule_id: string; fallback: boolean };

export async function learnRule(vulnFile: string, fixedFile: string, vulnCode: string, fixedCode: string,
  attack?: Attack): Promise<LearnedRule> {
  await mkdir(resolve(ROOT, "rules/learned"), { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      const yaml = extractFence(await chat(openai, MODELS.fast, RULE_WRITER_SYSTEM,
        `VULNERABLE:\n${vulnCode}\n\nFIXED:\n${fixedCode}\n\nATTACK:\n${JSON.stringify(attack?.email ?? {})}`,
        { reasoning_effort: "minimal" }), "yaml");
      // Validate in sandbox/ first so a bad candidate never loads into later scans.
      const candidate = resolve(ROOT, `sandbox/rule-candidate-${Date.now()}.yaml`);
      await mkdir(dirname(candidate), { recursive: true });
      await writeFile(candidate, yaml);
      const hitsVuln = (await scan(vulnFile, [candidate])).length;
      const hitsFixed = (await scan(fixedFile, [candidate])).length;
      if (hitsVuln > 0 && hitsFixed === 0) {
        // Models often quote the id; strip quotes and anything that is unsafe in a file name.
        const raw = (yaml.match(/id:\s*["']?([^\s"']+)/) ?? [])[1] ?? "agentguard.learned.rule";
        const rule_id = raw.replace(/[^\w.-]/g, "_");
        const path = resolve(ROOT, `rules/learned/${rule_id}.yaml`);
        await copyFile(candidate, path);
        return { path, rule_id, fallback: false };
      }
    } catch { /* retry once, then fall back */ }
  }
  const path = resolve(ROOT, "rules/learned/money-sink.yaml");
  await copyFile(resolve(ROOT, "rules/fallback/money-sink.yaml"), path);
  return { path, rule_id: "agentguard.learned.money-sink", fallback: true };
}
