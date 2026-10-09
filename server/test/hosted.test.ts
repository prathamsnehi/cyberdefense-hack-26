import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createHostedApp } from "../src/hosted";

const root = await mkdtemp(join(tmpdir(), "albert-hosted-"));
await writeFile(join(root, "index.html"), "<!doctype html><title>Albert AI</title>");
afterAll(() => rm(root, { recursive: true, force: true }));
const api = new Hono();
api.get("/metrics", (c) => { c.header("Access-Control-Allow-Origin", "*"); return c.json({ total_events: 7 }); });
api.post("/loop/start", async (c) => c.json({ authorization: c.req.header("authorization"), key: c.req.header("x-api-key") ?? null, body: await c.req.json() }));
api.get("/loop/:id/events", (c) => new Response(`id: ${Number(c.req.header("Last-Event-ID")) + 1}\ndata: {"step":"done"}\n\n`, { headers: { "Content-Type": "text/event-stream" } }));
const options = { username: "team", password: "test-password", backendToken: "private-backend-token", dashboardRoot: root };
const host = createHostedApp(api, options);
const auth = { Authorization: `Basic ${Buffer.from("team:test-password").toString("base64")}` };

describe("standalone Akash dashboard", () => {
  it("requires deployment credentials and exposes only a public health check", async () => {
    expect(() => createHostedApp(api, { ...options, password: "" })).toThrow("DASHBOARD_PASSWORD");
    expect((await host.request("/health")).status).toBe(200);
    for (const path of ["/", "/api/metrics", "/api/loop/start", "/api/loop/run/events"]) {
      expect((await host.request(path)).status).toBe(401);
      expect((await host.request(path, { headers: { Authorization: "Bearer private-backend-token" } })).status).toBe(401);
    }
  });
  it("serves built UI and actual API data under one authenticated origin", async () => {
    const page = await host.request("/", { headers: auth });
    expect(await page.text()).toContain("Albert AI");
    const response = await host.request("/api/metrics", { headers: auth });
    expect(await response.json()).toEqual({ total_events: 7 });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await host.request("/.env", { headers: auth })).status).toBe(404);
    expect((await host.request("/metrics", { headers: auth })).status).toBe(404);
  });
  it("injects the backend token privately and forwards request bodies", async () => {
    const response = await host.request("https://albert.example/api/loop/start", {
      method: "POST", headers: { ...auth, "Content-Type": "application/json", Origin: "https://albert.example", "X-API-Key": "untrusted" },
      body: JSON.stringify({ agent_id: "invoice-bot" }),
    });
    expect(await response.json()).toEqual({ authorization: "Bearer private-backend-token", key: null, body: { agent_id: "invoice-bot" } });
  });
  it("rejects cross-site mutations before calling the API", async () => {
    const crossSiteHeaders: Record<string, string>[] = [{ Origin: "https://attacker.example" }, { "Sec-Fetch-Site": "cross-site" }];
    for (const extra of crossSiteHeaders) {
      expect((await host.request("https://albert.example/api/loop/start", { method: "POST", headers: { ...auth, ...extra }, body: "{}" })).status).toBe(403);
    }
  });
  it("forwards SSE without buffering and preserves replay cursors", async () => {
    const response = await host.request("/api/loop/run/events", { headers: { ...auth, "Last-Event-ID": "4" } });
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(await response.text()).toContain("id: 5");
  });
});
