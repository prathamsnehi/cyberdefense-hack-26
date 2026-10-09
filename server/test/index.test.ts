import { describe, expect, it } from "vitest";
import { app, lazy } from "../src/index";

// AWS-30 Scenario: npm run dev boots with stubs and /health answers {"ok":true}
describe("HTTP server", () => {
  it("GET /health returns {ok:true}", async () => {
    const r = await app.request("/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("POST /brief answers from the brief stub", async () => {
    const r = await app.request("/brief", { method: "POST", body: JSON.stringify({ task: "x" }), headers: { "content-type": "application/json" } });
    expect(await r.json()).toEqual({ brief_md: "(brief not configured)", runtime: "local" });
  });

  it("GET /metrics serves the queries module (stub in tests until WS-C lands)", async () => {
    const r = await app.request("/metrics");
    expect(r.status).toBe(200);
    expect(await r.json()).toHaveProperty("total_events");
  });

  it("sends CORS headers", async () => {
    const r = await app.request("/health", { headers: { origin: "http://localhost:5173" } });
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
  });
});

// AWS-30: the server boots even when other-workstream modules are missing
describe("lazy", () => {
  it("returns null instead of throwing when a module cannot be loaded", async () => {
    expect(await lazy(() => import("../src/does-not-exist" as string))).toBeNull();
  });
  it("returns the module when it loads", async () => {
    expect(await lazy(async () => ({ x: 1 }))).toEqual({ x: 1 });
  });
});
