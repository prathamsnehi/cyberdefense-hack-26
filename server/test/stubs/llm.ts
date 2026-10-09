// Test stub for server/src/llm.ts (WS-A, Task A2). Same exports; never calls a real model.
export const neon = {} as any;
export const openai = neon;
export const akash = {} as any;
export const target = {} as any;
export const MODELS = { reasoning: "stub-reasoning", fast: "stub-fast", volume: "stub-volume", target: "stub-target" };

export async function chat(_client: unknown, _model: string, _system: string, _user: string,
  _extra: Record<string, unknown> = {}): Promise<string> {
  throw new Error("llm stub: no model available in tests");
}

export function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in model output: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]) as T;
}

export function extractFence(text: string, lang: string): string {
  const alts = lang === "typescript" ? "(?:typescript|ts)" : lang;
  const m = text.match(new RegExp("```" + alts + "[^\\n]*\\n([\\s\\S]*?)```"));
  if (!m) throw new Error(`No \`\`\`${lang} block in model output`);
  return m[1];
}
