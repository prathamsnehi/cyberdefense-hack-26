import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(ROOT, ".env"), quiet: true });

const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k} (see .env.example)`);
  return v;
};
const opt = (k: string, d = "") => process.env[k] || d;
if (opt('CLICKHOUSE_DATABASE', 'albert') !== 'albert') throw new Error('Albert schema requires CLICKHOUSE_DATABASE=albert');

// "openai" is accepted as an alias of "neon": both mean the OpenAI-compatible client in llm.ts.
const rawProvider = opt("TARGET_PROVIDER", "neon");
if (!["neon", "openai", "akash"].includes(rawProvider)) {
  throw new Error("TARGET_PROVIDER must be neon, openai or akash (see .env.example)");
}
const targetProvider = rawProvider === "akash" ? "akash" : "neon";
const gatewayBase = opt("NEON_AI_GATEWAY_BASE_URL").replace(/\/+$/, "");
function validateGatewayHost(host: string) {
try {
  const url = new URL(host);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("invalid");
  }
} catch {
  throw new Error("NEON_AI_GATEWAY_BASE_URL must be a bare HTTPS host (see .env.example)");
}
}
if (gatewayBase) validateGatewayHost(gatewayBase);
const akashKey = opt("AKASHML_API_KEY") || opt("AKASH_API_KEY");
if (targetProvider === "akash" && !akashKey) throw new Error("Missing env var AKASHML_API_KEY (or AKASH_API_KEY)");

export const env = {
  PORT: Number(opt("PORT", "8787")),
  PUBLIC_URL: opt("PUBLIC_URL"),
  AGENTGUARD_API_KEY: req("AGENTGUARD_API_KEY"),
  AGENT_RUNTIME: opt("AGENT_RUNTIME", "local") as "local" | "guild",
  TARGET_PROVIDER: targetProvider as "neon" | "akash",
  NEON_AI_GATEWAY_TOKEN: opt("NEON_AI_GATEWAY_TOKEN"),
  NEON_AI_GATEWAY_BASE_URL: gatewayBase,
  NEON_MODEL: opt("NEON_MODEL", "gpt-5"),
  NEON_FAST_MODEL: opt("NEON_FAST_MODEL", "gpt-5-mini"),
  NEON_TARGET_MODEL: opt("NEON_TARGET_MODEL", "gpt-5-mini"),
  // OpenAI-compatible endpoint (Neon AI Gateway: <gateway host>/v1). OPENAI_* win; legacy NEON_* names are the
  // fallback; with neither base URL set the client talks to api.openai.com. Only model calls require the key.
  OPENAI_API_KEY: opt("OPENAI_API_KEY") || opt("NEON_AI_GATEWAY_TOKEN"),
  OPENAI_BASE_URL: (opt("OPENAI_BASE_URL") || (gatewayBase ? `${gatewayBase}/v1` : "https://api.openai.com/v1")).replace(/\/+$/, ""),
  OPENAI_MODEL: opt("OPENAI_MODEL") || opt("NEON_MODEL", "gpt-5"),
  OPENAI_FAST_MODEL: opt("OPENAI_FAST_MODEL") || opt("NEON_FAST_MODEL", "gpt-5-mini"),
  OPENAI_TARGET_MODEL: opt("OPENAI_TARGET_MODEL") || opt("NEON_TARGET_MODEL", "gpt-5-mini"),
  AKASHML_API_KEY: akashKey,
  AKASHML_MODEL: opt("AKASHML_MODEL", "openai/gpt-oss-120b"),
  TARGET_MODEL: opt("TARGET_MODEL", "meta-llama/Llama-3.3-70B-Instruct"),
  CLICKHOUSE_URL: req("CLICKHOUSE_URL"),
  CLICKHOUSE_USER: opt("CLICKHOUSE_USER", "default"),
  CLICKHOUSE_PASSWORD: req("CLICKHOUSE_PASSWORD"),
  CLICKHOUSE_DATABASE: opt("CLICKHOUSE_DATABASE", "albert"),
  SENSO_API_KEY: opt("SENSO_API_KEY"),
  GUILD_WORKSPACE: opt("GUILD_WORKSPACE"),
  GUILD_REDTEAM_KEY_ID: opt("GUILD_REDTEAM_KEY_ID"),
  GUILD_REDTEAM_KEY_SECRET: opt("GUILD_REDTEAM_KEY_SECRET"),
  GUILD_FIXER_KEY_ID: opt("GUILD_FIXER_KEY_ID"),
  GUILD_FIXER_KEY_SECRET: opt("GUILD_FIXER_KEY_SECRET"),
  GITHUB_TOKEN: opt("GITHUB_TOKEN") || opt("GH_APP_TOKEN"),
  GITHUB_REPO: opt("GITHUB_REPO") || opt("GH_REPO_NAME", "prathamsnehi/cyberdefense-hack-26"),
  SEMGREP_BIN: opt("SEMGREP_BIN", "semgrep"),
};

/** Database and dashboard imports need no model credential; actual model calls do. */
export function requireLlm() {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing env var OPENAI_API_KEY (or NEON_AI_GATEWAY_TOKEN) (see .env.example)");
  try {
    const u = new URL(env.OPENAI_BASE_URL);
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error("invalid");
  } catch {
    throw new Error("OPENAI_BASE_URL must be an http(s) URL without credentials (see .env.example)");
  }
  return { apiKey, baseURL: env.OPENAI_BASE_URL };
}
/** @deprecated name kept for older imports. */
export const requireNeonGateway = requireLlm;
