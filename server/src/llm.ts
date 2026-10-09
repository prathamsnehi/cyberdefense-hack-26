import OpenAI from "openai";
import { env } from "./env";

// A hung model call must not freeze the demo: two minutes, one retry.
const opts = { timeout: 120_000, maxRetries: 1 };

export const neon = new OpenAI({
  apiKey: env.NEON_AI_GATEWAY_TOKEN,
  baseURL: `${env.NEON_AI_GATEWAY_BASE_URL}/v1`,
  ...opts,
});
// Compatibility for workstreams that still import this name; it always routes through Neon.
export const openai = neon;
// Akash is optional; env.ts requires its key only when TARGET_PROVIDER=akash.
export const akash = new OpenAI({ apiKey: env.AKASHML_API_KEY || "missing", baseURL: "https://api.akashml.com/v1", ...opts });

const onAkash = env.TARGET_PROVIDER === "akash";
// The vulnerable demo agent (and attack generation) run on this client.
export const target = onAkash ? akash : neon;

export const MODELS = {
  reasoning: env.NEON_MODEL,
  fast: env.NEON_FAST_MODEL,
  volume: onAkash ? env.AKASHML_MODEL : env.NEON_TARGET_MODEL,
  target: onAkash ? env.TARGET_MODEL : env.NEON_TARGET_MODEL,
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
