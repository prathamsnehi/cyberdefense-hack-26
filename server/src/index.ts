import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { nanoid } from "nanoid";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { brief } from "./brief";
import type { LoopEvent } from "./contracts";
import { env } from "./env";
import { toolsRouter } from "./tools";

// bus, loop and queries belong to other workstreams and may not be merged yet. Loading them lazily keeps
// /health (and everything else) up when they are missing; their routes answer 503 until they land.
export async function lazy<T>(load: () => Promise<T>): Promise<T | null> {
  try { return await load(); } catch (e) {
    console.error("[api] module unavailable:", String(e).slice(0, 200));
    return null;
  }
}
const unavailable = (c: Context, what: string) => c.json({ error: `${what} not available yet` }, 503);

export const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true }));

app.post("/loop/start", async (c) => {
  const loop = await lazy(() => import("./loop"));
  if (!loop) return unavailable(c, "loop");
  const { agent_id = "invoice-bot" } = await c.req.json().catch(() => ({}));
  const run_id = nanoid(8);
  void loop.runLoop(run_id, agent_id);
  return c.json({ run_id });
});

app.get("/loop/:id/events", async (c) => {
  const mod = await lazy(() => import("./bus"));
  if (!mod) return unavailable(c, "bus");
  const { bus } = mod;
  return streamSSE(c, async (stream) => {
    const id = c.req.param("id");
    for (const e of bus.history(id)) await stream.writeSSE({ data: JSON.stringify(e) });
    const off = bus.on(id, (e: LoopEvent) => { void stream.writeSSE({ data: JSON.stringify(e) }); });
    stream.onAbort(off);
    while (!stream.aborted) await stream.sleep(15000);
  });
});

const queries = () => lazy(() => import("./queries"));
app.get("/metrics", async (c) => { const q = await queries(); return q ? c.json(await q.metrics()) : unavailable(c, "queries"); });
app.get("/events/blocked", async (c) => { const q = await queries(); return q ? c.json(await q.recentBlocked()) : unavailable(c, "queries"); });
app.get("/fleet/hunt", async (c) => { const q = await queries(); return q ? c.json(await q.fleetHunt()) : unavailable(c, "queries"); });
app.get("/runs/:id/scoreboard", async (c) => {
  const q = await queries();
  return q ? c.json(await q.attackScoreboard(c.req.param("id"))) : unavailable(c, "queries");
});
app.post("/brief", async (c) => c.json(await brief((await c.req.json().catch(() => ({}))).task ?? "")));
app.route("/tools", toolsRouter);

// Only listen when run directly (npm run dev / start); tests import `app` and call app.request().
const isMain = (() => {
  try { return !!process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
})();
if (isMain) {
  serve({ fetch: app.fetch, port: env.PORT });
  console.log(`AgentGuard API on :${env.PORT}`);
}
