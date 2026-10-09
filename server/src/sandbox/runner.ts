// Child-process entry: one process per agent version, so a patched file gets a clean runtime and can be killed.
//   npx tsx src/sandbox/runner.ts --agent ../targets/invoice-bot/agent.ts --agent-id invoice-bot --version v1 --port 4100 --guard off
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ROOT } from "../env";
import { MODELS, target } from "../llm";
import { makeLocalGateway, type Gateway, type GatewayOpts } from "./localGateway";
import type { Email, HandleEmail } from "../contracts";

const { values: a } = parseArgs({ options: {
  agent: { type: "string" }, "agent-id": { type: "string" }, version: { type: "string" },
  port: { type: "string" }, guard: { type: "string", default: "on" },
} });

const mod = (await import(pathToFileURL(resolve(a.agent!)).href)) as { handleEmail: HandleEmail };

// WS-C's toolGateway.ts and clickhouse.ts are the real thing. While they are not on main the runner falls back to
// an in-memory gateway and the committed payee list, so targets and patches can still be exercised.
// The paths are variables on purpose: a literal import of a missing file breaks the typecheck.
const optional = async <T>(path: string): Promise<T | null> => { try { return (await import(path)) as T; } catch { return null; } };
const gw = await optional<{ makeGateway: (o: GatewayOpts) => Gateway }>("../toolGateway");
const ch = await optional<{ timedQuery: <T>(q: string, p?: Record<string, unknown>) => Promise<{ rows: T[] }> }>("../clickhouse");
const makeGateway = gw?.makeGateway ?? makeLocalGateway;
if (!gw) console.error("[runner] src/toolGateway.ts not found: local gateway, no ClickHouse rows");

let knownPayees: string[] = JSON.parse(readFileSync(resolve(ROOT, "targets/fixtures/known-payees.json"), "utf8"));
if (ch) {
  const payees = await ch.timedQuery<{ account: string }>(
    `SELECT account FROM payees FINAL WHERE agent_id = {id:String}`, { id: a["agent-id"]! });
  knownPayees = payees.rows.map((r) => r.account);
}

const app = new Hono();
app.post("/run", async (c) => {
  const { email, attack_id = "" } = await c.req.json<{ email: Email; attack_id?: string }>();
  const session_id = nanoid(12);
  const { tools, recordEmail } = makeGateway({
    agent_id: a["agent-id"]!, version: a.version!, session_id, attack_id,
    guard: a.guard === "on", knownPayees,
  });
  await recordEmail(email);
  try {
    await mod.handleEmail(email, { llm: target, model: MODELS.target, tools, knownPayees });
    return c.json({ session_id, ok: true });
  } catch (e) {
    return c.json({ session_id, ok: false, error: String(e) }); // a thrown guard ("Blocked: ...") is a valid outcome
  }
});

// Port 0 lets the OS pick a free port, so restarts of the parent (tsx watch) never collide with a leftover
// runner. READY is printed from the listening callback, never before the socket is open.
serve({ fetch: app.fetch, port: Number(a.port ?? 0) }, (info) => console.log(`READY ${info.port}`));
