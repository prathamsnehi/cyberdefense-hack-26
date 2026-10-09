import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const args = process.argv.slice(2);
const check = args.includes("--check");
const file = args.find((arg) => arg !== "--check") ?? "../.env";
const values = parse(readFileSync(resolve(file)));
const example = parse(readFileSync(new URL("../../.env.example", import.meta.url)));
const required = ["AGENTGUARD_API_KEY", "NEON_AI_GATEWAY_TOKEN", "NEON_AI_GATEWAY_BASE_URL", "CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"];
const missing = required.filter((key) => !values[key]?.trim());
if ((values.TARGET_PROVIDER ?? "neon") === "akash" && !values.AKASHML_API_KEY && !values.AKASH_API_KEY) missing.push("AKASHML_API_KEY");
if (missing.length) throw new Error(`Missing local values: ${missing.join(", ")}`);
const repo = values.GITHUB_REPO || "prathamsnehi/cyberdefense-hack-26";
for (const [key, value] of Object.entries(values)) {
  if (!value || !(key in example)) continue;
  const name = key === "GITHUB_TOKEN" ? "GH_APP_TOKEN" : key === "GITHUB_REPO" ? "GH_REPO_NAME" : key;
  if (key === "GITHUB_TOKEN" && values.GH_APP_TOKEN) continue;
  if (!check) {
    try {
      // stdin keeps values out of argv, shell history and logs. Never print gh errors.
      execFileSync("gh", ["secret", "set", name, "--repo", repo, "--app", "actions"], {
        input: value, stdio: ["pipe", "ignore", "pipe"],
      });
    } catch {
      console.error(`Failed to set Actions repository secret ${name}; check gh authentication and repo permissions.`);
      process.exit(1);
    }
  }
  console.log(`${check ? "Would set" : "Set"} ${name}`);
}
