# Albert AI on Akash Network

## Sponsor contribution

Akash Network hosts Albert AI's Hono API, security-loop orchestrator, per-version agent subprocesses, and Semgrep CLI. The team's primary React dashboard is served through Vercel and proxies its authenticated API and event stream to this Akash lease. Teammates use the Vercel URL without starting Codespaces or installing software. The container also retains a directly accessible dashboard for operational fallback.

This hosting role is distinct from AkashML inference. The hosted application uses Neon AI Gateway for model access, ClickHouse Cloud for audit evidence and dashboard analytics, and Semgrep for detection and validation. `TARGET_PROVIDER=akash` is an optional inference configuration; deploying this application to Akash does not require it.

**Deployment verification: Vercel frontend and Akash backend live.** The browser displays real ClickHouse metrics, and authenticated active-run discovery returns HTTP 200 through Vercel. Refresh during run `zDDo85v1` discovers it and offers **Observe active run**; choosing it restores the same timeline and scoreboard without starting another run. Run `zDDo85v1` completed with a learned-rule fallback, two sweep findings, a lesson event, and `done`; the gate accepted the explicitly labeled reference fix. SSE cursor replay checks passed.

## Deployment evidence

| Evidence | Verified value |
|---|---|
| Vercel team dashboard URL | `https://albert-ai-dashboard.vercel.app` (production and authenticated browser verified) |
| Akash HTTPS application ingress | `https://thiioenac5fg9en2rj224k050o.ingress.zencloud.eu` (TLS and `/health` 200 verified) |
| Akash deployment ID (dseq) | `1791581402807`, active lease |
| Provider address and hostname | `akash16yr3wxt97ae045a06kr3ycde9srcgpg8syjxxm`; `provider.zencloud.eu` |
| Immutable container image and digest | `ghcr.io/prathamsnehi/albert-ai:083c8ba98e00e7b5ad7b2e6efd4b98dc0e77018d`; `sha256:a9b10cc722384d5aa2fa2e73af30ad049c3e68e2a1f444ee139a0132168f33e3` (anonymous registry manifest verified) |
| Running source revision | Akash: `083c8ba98e00e7b5ad7b2e6efd4b98dc0e77018d`; Vercel: merged `ac073d94` source (same application code) |
| CPU / RAM / disk / replicas | 2 vCPU / 4 GiB / 10 GiB ephemeral / 1 (requested) |
| Sponsor credits and accepted bid | Console balance before deployment: $26, including $25 `AKASHCYBER25` credit. Accepted replacement bid: `21.195183 uact/block` on Zencloud, after the cheaper provider developed TLS failures. No card purchase or auto-recharge configured. |
| Funding runtime limit | 48 hours from lease start; Console reports `2026-10-11T21:30:40.563Z` (October 11, 2:30 PM Pacific) |
| HTTPS and team-login check | Valid certificate; `/health` 200 reports `hosting: akash`; root without login 401; authenticated root and `/api/loop/active` 200 |
| Live ClickHouse metrics and blocked feed | Authenticated `/api/metrics` 200: 868 audit events, 3 recent blocked actions, guard p95 98.018 ms before the hosted run; live browser tiles and denied feed verified through Vercel |
| Hosted loop and SSE replay | Run `zDDo85v1` started from the Vercel browser; baseline v1: 30 attacks, 24 succeeded, 0 infrastructure errors. Browser refresh and Observe active run replayed the same run and one v1 scoreboard row. Generated v2/v3/v4 patches rejected for failed legitimate-invoice checks. Explicitly labeled reference fallback v5 accepted: 30 attacks, 0 succeeded, 0 infrastructure errors, legitimate invoice passed. Run completed with fallback rule `agentguard.learned.money-sink`, findings in refund-bot and vendor-bot, a lesson event and `done`. GitHub PR/issue publishing was disabled because the hosted runtime has no GitHub token. |

The first provider deployment, `1791580538730` on ProntoAI, passed initial HTTPS checks but later failed TLS handshakes across its ingress. It was explicitly closed; Console confirmed the deployment and lease are both `closed`. The replacement Zencloud provider passed certificate verification with TLS 1.2 and TLS 1.3 using OpenSSL and a modern Node HTTPS client. Only the replacement lease remains active.

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

The only exposed application port is 8787, mapped to web ingress port 80. `/health` is public for provider checks. The dashboard and `/api/*` require the separate team login. Raw backend routes are not exposed at the top level. Vercel forwards the authenticated same-origin API and SSE requests; the Akash server must explicitly allow the chosen Vercel `DASHBOARD_ORIGIN`. Other cross-site mutations are rejected. Verified SSE IDs 1–19 increased strictly for `zDDo85v1`; replay with cursor 18 returned only ID 19 (`done`), and cursor 19 returned no duplicates. A separate observer received the terminal event after 50.83 seconds; that probe did not exercise the planned 130-second duration because the run finished.

## Vercel frontend setup

Import `prathamsnehi/cyberdefense-hack-26` into Vercel with project name `albert-ai-dashboard`, Git branch `main`, framework Vite, and root directory `dashboard`. The checked-in `dashboard/vercel.json` runs `npm run build` and publishes `dist`. Its server proxy protects static assets and routes `/api/*` to the Akash application; model and database credentials remain exclusively in Akash.

Configure exactly these three Vercel server environment variables for the team deployment:

- `ALBERT_BACKEND_URL=https://thiioenac5fg9en2rj224k050o.ingress.zencloud.eu`.
- `DASHBOARD_USER`: the same private team username as Akash.
- `DASHBOARD_PASSWORD`: the same private team password as Akash.

Keep all three free of the `VITE_` prefix so they remain server configuration. Set the matching exact frontend origin in Akash as `DASHBOARD_ORIGIN`. Production-team access uses the stable Vercel domain; preview domains require a separate explicit origin configuration to start runs.

External Vercel rewrites may end an SSE connection after approximately 120 seconds. The dashboard reconnects with its event cursor and the Akash event bus replays missed events. This transport reconnect does not cancel the running Akash defense loop. Browser observation and explicit cursor replay passed. The isolated transport probe ended normally at the run's terminal event before 130 seconds, so this deployment does not claim a tested uninterrupted 130-second stream.

## Runtime boundaries

Use one replica: SSE history, active-run locks, and agent subprocess tracking currently live in process memory. Run history resets on server restart, while acknowledged audit events remain in ClickHouse. Local generated lessons and rules use ephemeral storage in this initial deployment and reset on replacement. A durable event bus and persistent learned-rule storage are follow-up work, not features claimed by this demo.

Agent subprocesses are the existing demo execution model, not a security isolation boundary. The team login limits access to the demo; payment and email tools remain deterministic sandbox ledger/outbox actions.

Credits pay for the provider lease while it is active. Record the accepted bid and runtime limit; stop the deployment from Akash Console when no longer needed. Hosting-credit usage is separate from Neon inference and ClickHouse usage.

## Submission wording

After the deployment checks pass: “Albert AI runs its API, autonomous defense loop, agent execution, and Semgrep scans on Akash Network compute. Teammates and judges use the Vercel dashboard to trigger and inspect that live Akash workload; Neon routes model calls and ClickHouse stores action evidence.” Link the actual deployment evidence above rather than treating a configuration file as proof of execution.

## Official setup references

- [Akash Console API](https://akash.network/docs/api-documentation/console-api/api-reference/): deployment creation, provider bids, lease creation, updates, and runtime limits.
- [Akash SDL reference](https://akash.network/docs/developers/deployment/akash-sdl/): container resources and ingress declaration.
