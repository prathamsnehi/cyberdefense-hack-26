# Albert AI WS-C verification

Scope: AWS-22 tool gateway and AWS-32 dashboard, with their minimum ClickHouse prerequisites.
Branch: `codex/ws-c-active`. Execution environment: the existing private Codespace.

## Implemented interfaces

- `server/src/tools.ts`: `createToolGateway(context)` / `toolGateway` expose `payInvoice`, `readLedger`, and sandbox `sendEmail` as `Record<string, ToolFn>`. Runner metadata is trusted context; tool arguments cannot replace it. Payment audit acknowledgement commits the deterministic ledger action. Allowlist/audit failures never return successful receipts. Ambiguous writes reconcile by stable event ID without retrying the action.
- `server/schema/003_application.sql`: additive `albert.agent_events` migration, agent-scoped payees, repeatable invoice-bot seed, `blocked_events` view, findings and learned-rule tables. Legacy columns/rows remain intact.
- `server/src/clickhouse.ts` / `queries.ts`: awaited writes, sequential reads, audit-column whitelist, deduplicated logical actions, empty-safe metrics, parameterized hunt with actual ClickHouse query statistics. Setup verification rows remain stored but are excluded from application analytics.
- `dashboard/`: server-side Vite `/api` proxy to Hono `8787`; no backend token enters the browser bundle. Two-second non-overlapping refreshes, run-start protection, replay/reconnect deduplication, escaped attack content, safe HTTP(S) links, real metrics/feed/scoreboard/hunt results.
- Integration corrections retain the owning workstreams' implementations: SSE histories replay with increasing IDs; active runs serialize per agent; scanner failures cannot count as clean scans; legitimate invoice coverage is checked per session; Neon routing fails before chat access when misconfigured.

## Checks run in Codespaces

At source revision `2144ad2`: server **98 tests / 20 files passed**, including real Semgrep integration; full server `npm run typecheck` passed. Dashboard **21 tests / 2 files passed**; dashboard typecheck and production build passed. The runtime demonstration script added at `d693110` also passed full server typecheck and its live assertions.

No lint script is configured for the server or dashboard. No installation, test, build, or service execution was performed on the personal Mac.

Live ClickHouse proof (`npm run verify:clickhouse`):

- Migration applied twice; all **13** pre-existing rows preserved; invoice payee seed stayed stable.
- Two separate labelled ledger-verification sessions checked legitimate payment, guard ON/OFF, malformed amount, agent isolation, immediate reads, duplicate accounting, and ledger reads.
- Verification did not inflate application event/block metrics. Genuine empty hunt: 0 matches, 0 rows examined, 28.65 ms; null guard latency remained unavailable.
- Unit coverage additionally checks database failures and ambiguous audit writes.

## Live loop and browser evidence

First full run: `HjM6hv7r`, started through the dashboard button. Baseline **22/30** attacks succeeded; infrastructure errors **0**. Generated v2/v3/v4 patches each stopped attacks but failed legitimate payments, so each was rejected. The explicitly labelled hand-written reference v5 passed: **0/30**, happy path true, infrastructure errors 0. Rule learning used its labelled fallback, swept refund-bot and vendor-bot, saved a local lesson, and emitted `done`.

Live SSE reconnection proof: `Last-Event-ID: 4` replayed **15** events, IDs **5–19**, strictly increasing/unique, ending in `done`, all belonging to the same run.

Runtime guard demonstration: `runtime-guard-746afc1b-b02f-4b84-8bd0-653ca6799c20`. All legitimate invoices paid; all **3** bank-change seeds stopped; **3** real `tool_blocked` rows appeared in the dashboard. Recorded block timings: **54.23–62.01 ms**. These are real model/runner audit actions against the team's sandbox agent.

Second full run: `1L2qwl1w` completed independently with the same measured baseline **22/30**, labelled reference v5 **0/30**, happy path true, infrastructure errors 0, and terminal `done`. The dashboard cleared the first run's scores and timeline when it started. Direct service assertions confirmed each scoreboard retained five unique versions and its own run ID; totals did not accumulate across runs.

The hunt button returned actual suspicious-payment evidence: 154 rows examined in 27.2 ms during the first run. After both runs the service returned **47** matches, **651** rows examined, **28.889 ms**. No synthetic fleet generator was used.

## Runtime handoff

Private repository-root `.env` is configured in Codespaces from the authorized local environment values, mode `0600`. It stays outside Git. Neon uses the branch gateway host with `/v1`; no direct OpenAI credential is required. Both API and dashboard ports remain private.

Backend: `cd server && npm run start`. Dashboard: `cd dashboard && npm run dev`. Open the privately forwarded `5173` URL while signed into GitHub.

GitHub PR/issue publication is intentionally disabled for verification runs; the timeline explicitly reports `(github disabled)`. Senso is optional: with no Senso key, the actual local knowledge base supplies lessons. Reference-patch and learned-rule fallbacks are reported explicitly. Credential rotation and selection of a scoped database account remain user-owned.
