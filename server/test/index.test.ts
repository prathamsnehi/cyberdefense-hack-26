import { describe, expect, it, vi } from "vitest";
// The real brief (D5) calls the model; the route test only checks wiring.
vi.mock("../src/brief", () => ({ brief: async (task: string) => ({ brief_md: `brief for ${task}`, runtime: "local" }) }));
vi.mock('../src/queries', () => ({ metrics: async () => ({ total_events: 0 }) }));
import { app, lazy } from "../src/index";

// AWS-30 Scenario: npm run dev boots with stubs and /health answers {"ok":true}
describe("HTTP server", () => {
  it("GET /health returns {ok:true}", async () => {
    const r = await app.request("/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("POST /brief returns what brief() answers", async () => {
    const r = await app.request("/brief", { method: "POST", body: JSON.stringify({ task: "x" }), headers: { "content-type": "application/json" } });
    expect(await r.json()).toEqual({ brief_md: "brief for x", runtime: "local" });
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
