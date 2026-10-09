import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(ROOT, ".env") });

const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k} (see .env.example)`);
  return v;
};
const opt = (k: string, d = "") => process.env[k] ?? d;

export const env = {
  PORT: Number(opt("PORT", "8787")),
  PUBLIC_URL: opt("PUBLIC_URL"),
  AGENTGUARD_API_KEY: req("AGENTGUARD_API_KEY"),
  AGENT_RUNTIME: opt("AGENT_RUNTIME", "local") as "local" | "guild",
  TARGET_PROVIDER: opt("TARGET_PROVIDER", "akash") as "akash" | "openai",
  OPENAI_API_KEY: req("OPENAI_API_KEY"),
  OPENAI_MODEL: opt("OPENAI_MODEL", "gpt-5"),
  OPENAI_FAST_MODEL: opt("OPENAI_FAST_MODEL", "gpt-5-mini"),
  OPENAI_TARGET_MODEL: opt("OPENAI_TARGET_MODEL", "gpt-4o-mini"),
  AKASHML_API_KEY: opt("AKASHML_API_KEY"),
  AKASHML_MODEL: opt("AKASHML_MODEL", "openai/gpt-oss-120b"),
  TARGET_MODEL: opt("TARGET_MODEL", "meta-llama/Llama-3.3-70B-Instruct"),
  CLICKHOUSE_URL: req("CLICKHOUSE_URL"),
  CLICKHOUSE_USER: opt("CLICKHOUSE_USER", "default"),
  CLICKHOUSE_PASSWORD: req("CLICKHOUSE_PASSWORD"),
  SENSO_API_KEY: opt("SENSO_API_KEY"),
  GUILD_WORKSPACE: opt("GUILD_WORKSPACE"),
  GITHUB_TOKEN: opt("GITHUB_TOKEN"),
  GITHUB_REPO: opt("GITHUB_REPO"),
  SEMGREP_BIN: opt("SEMGREP_BIN", "semgrep"),
};
