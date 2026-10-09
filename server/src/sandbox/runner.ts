// One agent version in its own process, so a patched file gets a clean runtime and can be killed.
//   tsx src/sandbox/runner.ts --agent invoice-bot --version v1 --file <abs path to agent.ts> --port 4100 --guard off
// Prints "READY <port>" once it listens. POST /run {email, attack_id} -> {session_id, ok}.
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AgentContext, Email, HandleEmail, ToolFn } from "../contracts";
import { ROOT } from "../env";
import { MODELS, target } from "../llm";
import { localGateway, type GatewayOptions } from "./localGateway";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`Missing --${name}`);
  return v;
};

const agent_id = arg("agent");
const version = arg("version");
const file = resolve(arg("file"));
const port = Number(arg("port"));
const guard = arg("guard", "off") === "on";

const knownPayees: string[] = JSON.parse(readFileSync(resolve(ROOT, "targets/fixtures/known-payees.json"), "utf8"));

// WS-C's gateway logs to ClickHouse and enforces the guard. Until it lands, fall back to the in-memory one.
type GatewayFactory = (o: GatewayOptions) => Record<string, ToolFn>;
async function loadGateway(): Promise<GatewayFactory> {
  try {
    const path = "../toolGateway";  // not a literal: the file belongs to WS-C and may not exist yet
    const mod: any = await import(path);
    const factory = mod.toolGateway ?? mod.createToolGateway ?? mod.default;
    if (typeof factory === "function") return factory;
    console.error("[runner] src/toolGateway.ts has no gateway factory export; using the local gateway");
  } catch {
    console.error("[runner] src/toolGateway.ts not available; using the local gateway (no ClickHouse rows)");
  }
  return (o) => localGateway(o);
}

const gateway = await loadGateway();
const { handleEmail } = (await import(pathToFileURL(file).href)) as { handleEmail: HandleEmail };
if (typeof handleEmail !== "function") throw new Error(`${file} does not export handleEmail`);

const app = new Hono();
app.get("/health", (c) => c.json({ ok: true, agent_id, version, guard }));
app.post("/run", async (c) => {
  const { email, attack_id = "" } = (await c.req.json()) as { email: Email; attack_id?: string };
  const session_id = nanoid(10);
  const ctx: AgentContext = {
    llm: target, model: MODELS.target, knownPayees,
    tools: gateway({ agent_id, version, session_id, attack_id, guard, knownPayees,
      source: email.external ? "external" : "internal" }),
  };
  try {
    await handleEmail(email, ctx);
    return c.json({ session_id, ok: true });
  } catch (e) {
    // The agent crashed or the model call failed: an infra error for the batch runner, not a blocked attack.
    return c.json({ session_id, ok: false, error: String(e).slice(0, 300) }, 500);
  }
});

serve({ fetch: app.fetch, port }, () => console.log(`READY ${port}`));
