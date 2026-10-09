// Child-process entry: one process per agent version, so a patched file gets a clean runtime and can be killed.
//   npx tsx src/sandbox/runner.ts --agent ../targets/invoice-bot/agent.ts --agent-id invoice-bot --version v1 --port 4100 --guard off
// POST /run {email, attack_id?, run_id?} -> {session_id, ok, error?}. Add `--gateway local` to run without ClickHouse.
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ROOT } from "../env";
import { MODELS, target } from "../llm";
import { createLocalGateway, type GatewayContext } from "./localGateway";
import type { AgentEvent, Email, HandleEmail, ToolFn } from "../contracts";

const { values: a } = parseArgs({ options: {
  agent: { type: "string" }, "agent-id": { type: "string" }, version: { type: "string" },
  port: { type: "string" }, guard: { type: "string", default: "on" }, gateway: { type: "string", default: "clickhouse" },
} });
const agent_id = a["agent-id"]!, version = a.version!;

const mod = (await import(pathToFileURL(resolve(a.agent!)).href)) as { handleEmail: HandleEmail };

// WS-C's gateway (src/tools.ts) audits every tool call in ClickHouse and enforces the guard. The local gateway
// is for development only and has to be asked for; a broken ClickHouse must fail loudly, not degrade silently.
type Real = {
  createToolGateway: (c: GatewayContext) => Record<string, ToolFn>;
  insertEvents: (rows: AgentEvent[]) => Promise<void>;
  timedQuery: <T>(q: string, p?: Record<string, unknown>) => Promise<{ rows: T[] }>;
};
let real: Real | null = null;
let knownPayees: string[] = JSON.parse(readFileSync(resolve(ROOT, "targets/fixtures/known-payees.json"), "utf8"));
if (a.gateway !== "local") {
  // Variable paths on purpose: these files belong to WS-C, and a literal import of a missing file breaks the typecheck.
  const tools = "../tools", clickhouse = "../clickhouse";
  real = { ...(await import(tools)), ...(await import(clickhouse)) } as Real;
  const payees = await real.timedQuery<{ account: string }>(
    `SELECT account FROM payees FINAL WHERE agent_id = {id:String}`, { id: agent_id });
  knownPayees = payees.rows.map((r) => r.account);
} else {
  console.error("[runner] --gateway local: in-memory tools, no ClickHouse rows");
}

const app = new Hono();
app.post("/run", async (c) => {
  const { email, attack_id = "", run_id = "manual" } = await c.req.json<{ email: Email; attack_id?: string; run_id?: string }>();
  const session_id = nanoid(12);
  const context: GatewayContext = { run_id, agent_id, version, session_id, attack_id,
    source: email.external ? "external" : "internal", guard: a.guard === "on" };
  const gateway = real ? real.createToolGateway(context) : createLocalGateway(context, knownPayees);

  // Agents may swallow tool errors and report them to the model, so the runner keeps its own record of what the
  // gateway did: an infrastructure failure must never look like "the attack was stopped".
  const seen = { blocked: false, infra: "" };
  const tools = Object.fromEntries(Object.entries(gateway).map(([name, fn]): [string, ToolFn] => [name, async (args) => {
    try { return await fn(args); } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "TOOL_BLOCKED") seen.blocked = true;
      if (code === "INFRASTRUCTURE_ERROR") seen.infra = String(e);
      throw e;
    }
  }]));

  let crash = "";
  try {
    // The gateway only audits tool calls; the hunt for "external email, then a new payee" needs this row too.
    await real?.insertEvents([{ ...context, event_type: "email_received", tool: "", is_new_payee: 0, fleet: 0,
      args: JSON.stringify({ from: email.from, subject: email.subject }) } as AgentEvent]);
  } catch (e) { seen.infra = String(e); }
  if (!seen.infra) {
    try { await mod.handleEmail(email, { llm: target, model: MODELS.target, tools, knownPayees }); }
    catch (e) { crash = String(e); }
  }

  if (seen.infra) return c.json({ session_id, ok: false, error: `Infrastructure: ${seen.infra}` });
  // "Blocked:" marks a defense (the guard, or requireKnownPayee in a fixed agent) for the batch runner.
  if (crash) return c.json({ session_id, ok: false, error: seen.blocked && !/Blocked:/.test(crash) ? `Blocked: ${crash}` : crash });
  return c.json({ session_id, ok: true });
});

// Port 0 lets the OS pick a free port, so restarts of the parent (tsx watch) never collide with a leftover
// runner. READY is printed from the listening callback, never before the socket is open.
serve({ fetch: app.fetch, port: Number(a.port ?? 0) }, (info) => console.log(`READY ${info.port}`));
