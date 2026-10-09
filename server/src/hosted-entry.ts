import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { app } from "./index";
import { env, ROOT } from "./env";
import { createHostedApp } from "./hosted";

const hosted = createHostedApp(app, {
  username: process.env.DASHBOARD_USER ?? "",
  password: process.env.DASHBOARD_PASSWORD ?? "",
  backendToken: env.AGENTGUARD_API_KEY,
  dashboardRoot: resolve(ROOT, "dashboard/dist"),
  dashboardOrigin: process.env.DASHBOARD_ORIGIN,
});
serve({ fetch: hosted.fetch, hostname: "0.0.0.0", port: env.PORT });
console.log(`Albert AI hosted dashboard on :${env.PORT}`);
