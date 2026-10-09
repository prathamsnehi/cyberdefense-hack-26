# Albert AI on Akash Network

## Sponsor contribution

Akash Network hosts Albert AI's Hono API, security-loop orchestrator, per-version agent subprocesses, and Semgrep CLI. The team's primary React dashboard is served through Vercel and proxies its authenticated API and event stream to this Akash lease. Teammates use the Vercel URL without starting Codespaces or installing software. The container also retains a directly accessible dashboard for operational fallback.

This hosting role is distinct from AkashML inference. The hosted application uses Neon AI Gateway for model access, ClickHouse Cloud for audit evidence and dashboard analytics, and Semgrep for detection and validation. `TARGET_PROVIDER=akash` is an optional inference configuration; deploying this application to Akash does not require it.

**Deployment verification: Akash backend live; Vercel frontend integration pending.** Console reports one ready replica. Verified public HTTPS health, required team authentication, and real ClickHouse metrics. The final image/origin update and hosted loop/browser checks remain pending.

## Deployment evidence

| Evidence | Verified value |
|---|---|
| Vercel team dashboard URL | Pending |
| Akash HTTPS application ingress | `https://cnticpg9nd8694b6pvk4fkm7p0.ingress.pronto-ai.pp.ua` (TLS and `/health` 200 verified) |
| Akash deployment ID (dseq) | `1791580538730`, active lease |
| Provider address and hostname | `akash1rja3y2ctj3tzmesvh0zfhzzx95rfjw405hwt8d`; `provider.pronto-ai.pp.ua` |
| Immutable container image and digest | Pending |
| Running source revision | Pending |
| CPU / RAM / disk / replicas | 2 vCPU / 4 GiB / 10 GiB ephemeral / 1 (requested) |
| Sponsor credits and accepted bid | Console balance before deployment: $26, including $25 `AKASHCYBER25` credit. Accepted bid: `15.542824 uact/block`; lowest bidder whose ingress passed certificate verification. No card purchase or auto-recharge configured. |
| Funding runtime limit | 48 hours from lease start; Console reports `2026-10-11T21:17:03.832Z` (October 11, 2:17 PM Pacific) |
| HTTPS and team-login check | Valid certificate; `/health` 200 reports `hosting: akash`; root without login 401; authenticated root and `/api/loop/active` 200 |
| Live ClickHouse metrics and blocked feed | Authenticated `/api/metrics` 200: 868 audit events, 3 recent blocked actions, guard p95 98.018 ms; browser panel check pending |
| Hosted loop and SSE replay | Pending |

## Build and deploy

The root `Dockerfile` builds the dashboard and packages Node.js 24, Semgrep 1.180.0, and the API/agent source. The `Akash deployment image` GitHub workflow publishes a commit-specific image to GHCR. No `.env`, credential document, personal setup files, or Git history enters the image.

Use `deploy/akash.yaml` as the deployment template. The Console API is authenticated with a deployment-only API key retained outside Git and never supplied to the application container. Only the listed application credentials enter its environment. The inspected Console settings replace submitted environment values with `ac-secret://` references; the provider still receives the runtime values needed to run the app. Provider administrators can access application runtime credentials; use scoped service credentials.

Replace its image placeholder with the verified commit tag or digest. Supply secret environment variables privately in the deployment configuration. Never commit or publicly share a filled SDL. Choose a provider that serves the ingress over working HTTPS before sharing team credentials.

Required runtime settings:

- `DASHBOARD_USER` and `DASHBOARD_PASSWORD`: separate team login, not a provider API key.
- `AGENTGUARD_API_KEY`: internal backend tool/start authorization; injected by the hosted server, never exposed in frontend assets.
- `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE=albert`.
- `NEON_AI_GATEWAY_TOKEN`, `NEON_AI_GATEWAY_BASE_URL`: the bare HTTPS gateway host. Keep any compatibility `OPENAI_BASE_URL` pointed to the same Neon gateway with `/v1`.
- `AGENT_RUNTIME=local`, `TARGET_PROVIDER=neon`, `PORT=8787`.
- `DASHBOARD_ORIGIN`: the exact HTTPS Vercel frontend origin, configured once the frontend domain is known.
- Optional model names, `SENSO_API_KEY`, and narrowly scoped `GITHUB_TOKEN` if the team enables publishing fixes/issues.

The only exposed application port is 8787, mapped to web ingress port 80. `/health` is public for provider checks. The dashboard and `/api/*` require the separate team login. Raw backend routes are not exposed at the top level. Vercel forwards the authenticated same-origin API and SSE requests; the Akash server must explicitly allow the chosen Vercel `DASHBOARD_ORIGIN`. Other cross-site mutations are rejected. Streaming and `Last-Event-ID` are verified after the final origin is configured.

## Vercel frontend setup

Import `prathamsnehi/cyberdefense-hack-26` into Vercel with project name `albert-ai-dashboard`, Git branch `main`, framework Vite, and root directory `dashboard`. The checked-in `dashboard/vercel.json` runs `npm run build` and publishes `dist`. Its server proxy protects static assets and routes `/api/*` to the Akash application; model and database credentials remain exclusively in Akash.

Configure exactly these three Vercel server environment variables for the team deployment:

- `ALBERT_BACKEND_URL=https://cnticpg9nd8694b6pvk4fkm7p0.ingress.pronto-ai.pp.ua`.
- `DASHBOARD_USER`: the same private team username as Akash.
- `DASHBOARD_PASSWORD`: the same private team password as Akash.

Keep all three free of the `VITE_` prefix so they remain server configuration. Set the matching exact frontend origin in Akash as `DASHBOARD_ORIGIN`. Production-team access uses the stable Vercel domain; preview domains require a separate explicit origin configuration to start runs.

External Vercel rewrites may end an SSE connection after approximately 120 seconds. The dashboard reconnects with its event cursor and the Akash event bus replays missed events. This transport reconnect does not cancel the running Akash defense loop. Verify this behavior in the live browser rather than claiming a single uninterrupted stream.

## Runtime boundaries

Use one replica: SSE history, active-run locks, and agent subprocess tracking currently live in process memory. Run history resets on server restart, while acknowledged audit events remain in ClickHouse. Local generated lessons and rules use ephemeral storage in this initial deployment and reset on replacement. A durable event bus and persistent learned-rule storage are follow-up work, not features claimed by this demo.

Agent subprocesses are the existing demo execution model, not a security isolation boundary. The team login limits access to the demo; payment and email tools remain deterministic sandbox ledger/outbox actions.

Credits pay for the provider lease while it is active. Record the accepted bid and runtime limit; stop the deployment from Akash Console when no longer needed. Hosting-credit usage is separate from Neon inference and ClickHouse usage.

## Submission wording

After the deployment checks pass: “Albert AI runs its API, autonomous defense loop, agent execution, and Semgrep scans on Akash Network compute. Teammates and judges use the Vercel dashboard to trigger and inspect that live Akash workload; Neon routes model calls and ClickHouse stores action evidence.” Link the actual deployment evidence above rather than treating a configuration file as proof of execution.

## Official setup references

- [Akash Console API](https://akash.network/docs/api-documentation/console-api/api-reference/): deployment creation, provider bids, lease creation, updates, and runtime limits.
- [Akash SDL reference](https://akash.network/docs/developers/deployment/akash-sdl/): container resources and ingress declaration.
