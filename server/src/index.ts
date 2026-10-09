import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { nanoid } from "nanoid";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { brief } from "./brief";
import { bus } from './bus';
import { subscribeRun, type Envelope } from './event-stream';
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
  if (c.req.header('authorization') !== `Bearer ${env.AGENTGUARD_API_KEY}`) return c.json({ error: 'Unauthorized' }, 401);
  const loop = await lazy(() => import("./loop"));
  if (!loop) return unavailable(c, "loop");
  const { agent_id = "invoice-bot" } = await c.req.json().catch(() => ({}));
  if (typeof agent_id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(agent_id)) return c.json({ error: 'Invalid agent_id' }, 400);
  const run_id = nanoid(8);
  bus.register(run_id);
  void loop.runLoop(run_id, agent_id);
  return c.json({ run_id });
});

app.get("/loop/:id/events", async (c) => {
  const mod = await lazy(() => import("./bus"));
  if (!mod) return unavailable(c, "bus");
  const id = c.req.param('id');
  const raw = c.req.header('Last-Event-ID') ?? '0';
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return c.json({ error: 'Invalid event cursor' }, 400);
  if (!bus.has(id) || Number(raw) > bus.history(id).length) return c.json({ error: 'Run history unavailable' }, 404);
  return streamSSE(c, async (stream) => {
    const queue: Envelope[] = [];
    let wake: (() => void) | undefined;
    const subscription = subscribeRun(id, Number(raw), entry => { queue.push(entry); wake?.(); });
    queue.unshift(...subscription.replay);
    let terminal = subscription.terminal;
    let last = Number(raw);
    stream.onAbort(() => { subscription.off(); wake?.(); });
    try {
      while (!stream.aborted) {
        while (queue.length) {
          const entry = queue.shift()!;
          if (entry.id <= last) continue;
          await stream.writeSSE({ id: String(entry.id), data: JSON.stringify(entry.event) });
          last = entry.id;
          if (entry.event.step === 'done' || entry.event.step === 'error') terminal = true;
        }
        if (terminal) break;
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, 15000);
          wake = () => { clearTimeout(timer); resolve(); };
          if (queue.length || stream.aborted) wake();
        });
        wake = undefined;
        if (!queue.length && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '' });
      }
    } finally { subscription.off(); }
  });
});

const queries = () => lazy(() => import("./queries"));
app.get("/metrics", async (c) => { const q = await queries(); return q ? c.json(await q.metrics()) : unavailable(c, "queries"); });
app.get("/events/blocked", async (c) => { const q = await queries(); return q ? c.json(await q.recentBlocked()) : unavailable(c, "queries"); });
app.get("/fleet/hunt", async (c) => { const q = await queries(); return q ? c.json(await q.fleetHunt(c.req.query('agent') ?? '')) : unavailable(c, "queries"); });
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
