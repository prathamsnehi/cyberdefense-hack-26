# Albert AI on Akash Network

## Sponsor contribution

Akash Network is the compute host for Albert AI's standalone security operations application: the React dashboard, Hono API, security-loop orchestrator, per-version agent subprocesses, and Semgrep CLI. A single Akash provider lease runs the complete application, so teammates can access its URL without starting Codespaces or installing software on their computers.

This hosting role is distinct from AkashML inference. The hosted application uses Neon AI Gateway for model access, ClickHouse Cloud for audit evidence and dashboard analytics, and Semgrep for detection and validation. `TARGET_PROVIDER=akash` is an optional inference configuration; deploying this application to Akash does not require it.

**Deployment verification: pending.** The container, SDL template, and authenticated production entrypoint are prepared; do not describe a live deployment until the evidence below is populated.

## Deployment evidence

| Evidence | Verified value |
|---|---|
| Public dashboard URL | Pending |
| Akash deployment ID (dseq) | Pending |
| Provider address and hostname | Pending |
| Immutable container image and digest | Pending |
| Running source revision | Pending |
| CPU / RAM / disk / replicas | 2 vCPU / 4 GiB / 10 GiB ephemeral / 1 (requested) |
| Sponsor credit balance and accepted bid | Pending |
| HTTPS and team-login check | Pending |
| Live ClickHouse metrics and blocked feed | Pending |
| Hosted loop and SSE replay | Pending |

## Build and deploy

The root `Dockerfile` builds the dashboard and packages Node.js 24, Semgrep 1.180.0, and the API/agent source. The `Akash deployment image` GitHub workflow publishes a commit-specific image to GHCR. No `.env`, credential document, personal setup files, or Git history enters the image.

Use `deploy/akash.yaml` as the deployment template. Replace its image placeholder with the verified commit tag or digest. Supply secret environment variables privately in the deployment configuration. Never commit or publicly share a filled SDL. Choose a provider that serves the ingress over working HTTPS before sharing team credentials.

Required runtime settings:

- `DASHBOARD_USER` and `DASHBOARD_PASSWORD`: separate team login, not a provider API key.
- `AGENTGUARD_API_KEY`: internal backend tool/start authorization; injected by the hosted server, never exposed in frontend assets.
- `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE=albert`.
- `NEON_AI_GATEWAY_TOKEN`, `NEON_AI_GATEWAY_BASE_URL`: the bare HTTPS gateway host. Keep any compatibility `OPENAI_BASE_URL` pointed to the same Neon gateway with `/v1`.
- `AGENT_RUNTIME=local`, `TARGET_PROVIDER=neon`, `PORT=8787`.
- Optional model names, `SENSO_API_KEY`, and narrowly scoped `GITHUB_TOKEN` if the team enables publishing fixes/issues.

The only exposed application port is 8787, mapped to web ingress port 80. `/health` is public for provider checks. The dashboard and `/api/*` require the team login. Raw backend routes are not exposed at the top level. Same-origin requests preserve SSE streaming and `Last-Event-ID`; cross-site mutations are rejected.

## Runtime boundaries

Use one replica: SSE history, active-run locks, and agent subprocess tracking currently live in process memory. Run history resets on server restart, while acknowledged audit events remain in ClickHouse. Local generated lessons and rules use ephemeral storage in this initial deployment and reset on replacement. A durable event bus and persistent learned-rule storage are follow-up work, not features claimed by this demo.

Agent subprocesses are the existing demo execution model, not a security isolation boundary. The team login limits access to the demo; payment and email tools remain deterministic sandbox ledger/outbox actions.

Credits pay for the provider lease while it is active. Record the accepted bid and runtime limit; stop the deployment from Akash Console when no longer needed. Hosting-credit usage is separate from Neon inference and ClickHouse usage.

## Submission wording

After the deployment checks pass: “Albert AI runs its live dashboard, API, and agent defense loop on Akash Network compute. Judges and teammates can trigger and inspect the demo through the hosted URL; Neon routes model calls, Semgrep validates code, and ClickHouse stores action evidence.” Link the actual deployment evidence above rather than treating a configuration file as proof of execution.
