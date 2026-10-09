import { chat, MODELS, openai } from "./llm";
import { searchLessons } from "./senso";

// Prevent (D5): the security brief the Claude Code hook injects before a coding agent writes code.
// Local only. The hook waits 25 s, so the fast model at minimal effort, and every step is capped.
const SYSTEM = `Before a coding agent writes code, give it the security brief it needs for THIS task, no more.
At most 8 bullets: untrusted inputs, minimum permissions, required guards (name functions like requireKnownPayee
from targets/shared/guards), then one "Sources:" line citing the lessons you used.`;

// What POST /brief answers whenever no model is reachable (and always in tests). brief() never throws.
const NOT_CONFIGURED = { brief_md: "(brief not configured)", runtime: "local" };
const MODEL_MS = 20_000;
const CONTEXT_MS = 4_000; // lessons + flaw classes, so context plus model stays inside the hook's 25 s

type Rows = { rows: Record<string, unknown>[] };

// A slow or failing context source (Senso, a cold ClickHouse) degrades to its fallback instead of eating the budget.
const capped = <T>(p: Promise<T>, fallback: T) =>
  Promise.race([p.catch(() => fallback), new Promise<T>((ok) => setTimeout(() => ok(fallback), CONTEXT_MS))]);

// queries.ts (WS-C) may not be on main yet. A non-literal specifier keeps tsc from resolving it; missing means no
// flaw classes.
const QUERIES = "./queries";
async function topFlaws(): Promise<Rows> {
  const q = await import(QUERIES).catch(() => null);
  return q ? q.topFlaws() : { rows: [] };
}

export async function brief(task: string): Promise<{ brief_md: string; runtime: string }> {
  try {
    const [lessons, flaws] = await Promise.all([
      capped(searchLessons(task), "(no lessons)"), capped(topFlaws(), { rows: [] })]);
    const brief_md = await chat(openai.withOptions({ timeout: MODEL_MS, maxRetries: 0 }), MODELS.fast, SYSTEM,
      `TASK: ${task}\n\nTOP FLAW CLASSES: ${JSON.stringify(flaws.rows)}\n\nLESSONS: ${lessons}`,
      { reasoning_effort: "minimal" });
    if (!brief_md.trim()) throw new Error("empty model output");
    return { brief_md, runtime: "local" };
  } catch (e) {
    console.error("[brief] unavailable:", String(e).slice(0, 200));
    return { ...NOT_CONFIGURED };
  }
}
