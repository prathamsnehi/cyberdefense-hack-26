import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { serveStatic } from "@hono/node-server/serve-static";

export type HostedOptions = {
  username: string;
  password: string;
  backendToken: string;
  dashboardRoot: string;
  dashboardOrigin?: string;
};

/** One authenticated origin for the dashboard and API. Model/database credentials never reach the browser. */
export function createHostedApp(api: Hono, options: HostedOptions) {
  if (!options.username || !options.password || !options.backendToken) {
    throw new Error("Hosted dashboard requires DASHBOARD_USER, DASHBOARD_PASSWORD and AGENTGUARD_API_KEY");
  }
  const dashboardOrigin = options.dashboardOrigin;
  if (dashboardOrigin) {
    const parsed = new URL(dashboardOrigin);
    if (parsed.protocol !== "https:" || parsed.origin !== dashboardOrigin) {
      throw new Error("DASHBOARD_ORIGIN must be an exact HTTPS origin");
    }
  }
  const host = new Hono();
  // Akash/provider health checks need no access to telemetry or model operations.
  host.get("/health", (c) => c.json({ ok: true, hosting: "akash" }));
  host.use("*", basicAuth({ username: options.username, password: options.password, realm: "Albert AI team" }));
  host.use("*", async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("origin");
      if (c.req.header("sec-fetch-site") === "cross-site") return c.json({ error: "Cross-site request blocked" }, 403);
      if (origin) {
        try {
          if (new URL(origin).host !== new URL(c.req.url).host && origin !== dashboardOrigin) return c.json({ error: "Cross-site request blocked" }, 403);
        } catch { return c.json({ error: "Invalid origin" }, 403); }
      }
    }
    await next();
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    c.header("X-Frame-Options", "DENY");
    // The underlying development API enables CORS. This hosted entry has one authenticated origin.
    c.res.headers.delete("access-control-allow-origin");
    c.res.headers.delete("access-control-allow-credentials");
  });
  host.all("/api/*", (c) => {
    const url = new URL(c.req.url);
    url.pathname = url.pathname.slice(4);
    const request = new Request(url, c.req.raw);
    request.headers.set("Authorization", `Bearer ${options.backendToken}`);
    request.headers.delete("X-API-Key");
    return api.fetch(request);
  });
  // Serve only the built dashboard, never the repository, .env, or sandbox files.
  host.get("*", serveStatic({ root: options.dashboardRoot }));
  host.notFound((c) => c.json({ error: "Not found" }, 404));
  return host;
}
