import OpenAI from "openai";
import { env } from "./env";

// A hung model call must not freeze the demo: two minutes, one retry.
const opts = { timeout: 120_000, maxRetries: 1 };

// On WS-C's setup the "openai" client goes through the Neon AI gateway: env.ts maps the Neon token and host onto
// OPENAI_API_KEY / OPENAI_BASE_URL. `|| "missing"` keeps the import from throwing when a key is empty; a real
// call then fails with a clear 401.
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY || "missing",
  baseURL: (env as { OPENAI_BASE_URL?: string }).OPENAI_BASE_URL || undefined, ...opts });
// AkashML speaks the OpenAI API.
export const akash = new OpenAI({ apiKey: env.AKASHML_API_KEY || "missing", baseURL: "https://api.akashml.com/v1", ...opts });

const onAkash = env.TARGET_PROVIDER === "akash";
// The vulnerable demo agent (and attack generation) run on this client.
export const target = onAkash ? akash : openai;

export const MODELS = {
  reasoning: env.OPENAI_MODEL,
  fast: env.OPENAI_FAST_MODEL,
  volume: onAkash ? env.AKASHML_MODEL : env.OPENAI_TARGET_MODEL,
  target: onAkash ? env.TARGET_MODEL : env.OPENAI_TARGET_MODEL,
};

export async function chat(client: OpenAI, model: string, system: string, user: string,
  extra: Record<string, unknown> = {}): Promise<string> {
  const res = await client.chat.completions.create({
    model, messages: [{ role: "system", content: system }, { role: "user", content: user }], ...extra,
  } as any);
  return res.choices[0]?.message?.content ?? "";
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
