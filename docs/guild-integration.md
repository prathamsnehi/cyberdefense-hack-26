# Guild integration runbook (D2b)

This runbook publishes the `agentguard` custom integration on Guild from `server/openapi.yaml` and proves it with one test call. Franco runs it by hand on his laptop, in order. **Go/no-go is at 2:15 PM PT.**

| Value | Used for |
| --- | --- |
| `unerasing-scripturally-sherie.ngrok-free.dev` | ngrok static domain. Also the integration base URL and `servers[0].url` in the spec. |
| `<owner>` | Your Guild username or org (`guild auth status` shows it). |
| `<AGENTGUARD_API_KEY>` | The value of `AGENTGUARD_API_KEY` in the repo-root `.env`. Guild sends it on every call. |

The integration exposes four operations. Guild names each agent tool `agentguard_<operationId>`:

| operationId | Method and path | Guild tool |
| --- | --- | --- |
| `get_target_profile` | `GET /tools/target-profile?agent_id=&compromised=` | `agentguard_get_target_profile` |
| `send_attack_batch` | `POST /tools/attack-batch` | `agentguard_send_attack_batch` |
| `get_run_context` | `GET /tools/run-context?run_id=` | `agentguard_get_run_context` |
| `submit_patch` | `POST /tools/patch` | `agentguard_submit_patch` |

## Before you start

- Node 22 or later, with `npm i -g @guildai/cli` and `guild auth login` done. This runbook was checked against `@guildai/cli` 0.27.1.
- ngrok is installed, `ngrok config add-authtoken <token>` is done and the static domain above is reserved.
- `AGENTGUARD_API_KEY` is set in the repo-root `.env`, and the server is running: `cd server && npm run dev`. Expected output: `AgentGuard API on :8787`.
- **D2a must be on `main`.** Until it lands, `server/src/tools.ts` is a stub and every `/tools/*` call returns 404, so step 8 fails even when everything else is right. Steps 1 to 7 do not need D2a.

## Steps

### 1. Expose the server

```bash
ngrok http --url=unerasing-scripturally-sherie.ngrok-free.dev 8787
```

Expected: the ngrok console shows `Forwarding https://unerasing-scripturally-sherie.ngrok-free.dev -> http://localhost:8787`. Keep this terminal open for the rest of the runbook and during every Guild run.

### 2. Confirm ngrok answers JSON

```bash
curl -s -H "Accept: application/json" https://unerasing-scripturally-sherie.ngrok-free.dev/health
```

Expected: `{"ok":true}`

If you get HTML instead, ngrok is serving its interstitial page. Do not continue until this returns JSON. See "Notes".

Optional, once D2a is on `main`: `curl -s -H "X-API-Key: wrong" "https://unerasing-scripturally-sherie.ngrok-free.dev/tools/run-context?run_id=x"` should print `{"error":"unauthorized"}`.

### 3. Create the integration

```bash
guild integration create agentguard --base-url https://unerasing-scripturally-sherie.ngrok-free.dev --auth-scheme api-key --header-template "X-API-Key: {token}" --description "AgentGuard sandbox and security tools"
```

Expected: `Integration created successfully`, then `Name agentguard`, `Owner <owner>`, `Base URL https://unerasing-scripturally-sherie.ngrok-free.dev`, `Header X-API-Key: {token}` and `Version <uuid> (draft)`. The command creates the first draft version for you, so **do not** run `guild integration version create`, which would leave you with two empty drafts.

`--header-template "X-API-Key: {token}"` is the CLI's default. It is written out here so the CLI never prompts for it.

### 4. Import the four operations from the spec

```bash
guild integration operation create <owner>~agentguard --openapi ./server/openapi.yaml
```

Run it from the repo root. Expected: `OpenAPI operation generation triggered`. Guild generates the operations asynchronously, so check them:

```bash
guild integration operation list <owner>~agentguard
```

Expected: an `Operations` table with exactly four rows, `get_target_profile GET /tools/target-profile`, `send_attack_batch POST /tools/attack-batch`, `get_run_context GET /tools/run-context` and `submit_patch POST /tools/patch`. If the table is still empty, wait a few seconds and run the list again. Add `--json` to see the generated input and output schemas.

### 5. Build (validate) the version

```bash
guild integration version build <owner>~agentguard --version-number 1.0.0
```

Expected: `Building version 1.0.0...`, then `Build finished` and a table with `Version Number 1.0.0` and `Status Valid`. The exit code is 0. If the status is `Failed`, run `guild integration version get <owner>~agentguard --version-number 1.0.0 --json` and read the validation errors.

### 6. Publish the version

```bash
guild integration version publish <owner>~agentguard --version-number 1.0.0
```

Expected: `Publishing version 1.0.0...`, then `Version published` and a table with `Version Number 1.0.0` and a `Published` date. **From here on, the base URL is fixed** (see "Notes").

### 7. Store the API key as a credential

```bash
guild integration connect <owner>~agentguard --owner <owner> --token <AGENTGUARD_API_KEY>
```

Expected: `Connected to agentguard`, then `Credential ID <uuid>`, `Integration <owner>~agentguard` and `Owner <owner>`.

### 8. Make one test call (requires D2a)

```bash
guild integration version test <owner>~agentguard --operation get_target_profile --account <owner> --input-query '{"agent_id":"invoice-bot"}'
```

`agent_id` is a required query parameter, so the test passes it with `--input-query`.

Expected:

```
Testing operation: get_target_profile

Request
  URL      https://unerasing-scripturally-sherie.ngrok-free.dev/tools/target-profile?agent_id=invoice-bot

Response
  Status   200
  Type     application/json

Body
  {
    "agent_id": "invoice-bot",
    "description": "Accounts-payable agent. ...",
    "tools": ["payInvoice", "sendEmail", "readLedger"]
  }
```

The ngrok console also logs `GET /tools/target-profile 200`. Other results:

- `Status 401` with `{"error":"unauthorized"}`: the stored token does not match `AGENTGUARD_API_KEY` in `.env`. Re-run step 7 with the right value.
- `Status 404`: D2a is not on `main` yet, or the server is running an old checkout.
- An HTML body: this is the ngrok interstitial. Go back to step 2.

A 200 here is the **go** signal for D3b.

## How the api-key scheme sends the key

The `api-key` auth scheme stores a **header template**. On every operation call, Guild replaces `{token}` in the template with the credential saved by `guild integration connect --token` and sends the result as a request header. The default template is `X-API-Key: {token}`, so Guild sends `X-API-Key: <AGENTGUARD_API_KEY>`. That is the header `server/openapi.yaml` declares (`components.securitySchemes.apiKey`, header `X-API-Key`, applied globally).

The server accepts either `X-API-Key: <key>` or `Authorization: Bearer <key>`. To switch to Bearer, run `guild integration update <owner>~agentguard --header-template "Authorization: Bearer {token}"`. Unlike the base URL, the header template can be changed after publishing. The agents never see the raw key, because the Guild runtime injects it server-side.

Where this comes from: `docs.guild.ai/integrations/auth-schemes` could not be reached from the environment that wrote this runbook. The docs search index lists the schemes as API Key (`API_KEY`), OAuth 2.0 (`OAUTH`) and none (`NONE`). The header-template behaviour, the `X-API-Key: {token}` default and every command shape above come from the `@guildai/cli` 0.27.1 package, both its command source and its bundled `docs/skills/integrations.md`. If the docs page you read disagrees, follow the page and correct this file.

## Fallback: define the operations by hand

`operation create --openapi` exists in CLI 0.27.1. If your installed CLI does not have it (`guild integration operation create --help` does not list `--openapi`), or the import produces fewer than four operations, create the four operations by hand in the Guild UI from `server/openapi.yaml`. Copy the operationIds and summaries verbatim, because the agents' tool names and descriptions come from them.

| operationId | Method | Path | Inputs |
| --- | --- | --- | --- |
| `get_target_profile` | GET | `/tools/target-profile` | query `agent_id` (string, required), `compromised` (string, optional) |
| `send_attack_batch` | POST | `/tools/attack-batch` | JSON body `run_id`, `agent_id`, `version`, `technique` (strings), `count` (integer 1 to 10), all required |
| `get_run_context` | GET | `/tools/run-context` | query `run_id` (string, required) |
| `submit_patch` | POST | `/tools/patch` | JSON body `run_id`, `version`, `file_content`, `rationale` (strings, required), `citations` (string array, optional) |

The CLI can also create one operation at a time (`--operation`, `--method`, `--path`, `--summary`, `--input-body-schema <file>`, `--output-body-schema <file>`). It has no flag for query parameters, though, so use the UI for the two GET operations. Then continue from step 5.

## Notes

- **The base URL cannot change after the first publish.** `guild integration update` has no `--base-url` flag. If the ngrok domain ever changes, you have to create a new integration under a new name and rebuild D3b against it. Keep the ngrok domain stable.
- **The ngrok interstitial.** On the free tier, ngrok shows a "You are about to visit" HTML page to browser-like clients, meaning requests whose `User-Agent` or `Accept` header looks like a browser's. Hence the `Accept: application/json` in step 2. If Guild's test call ever gets HTML back, the interstitial is the cause. The fix that keeps the same domain, and therefore the same integration, is a paid ngrok plan, which does not show the interstitial.
- **Go/no-go at 2:15 PM PT.** **Go** means step 8 returns 200 with JSON by 2:15 PM PT. **No-go** means Guild becomes a README mention only, and D3b (the Guild red-team and fixer agents) and D4 (red-teaming our own agent) are dropped. The demo always runs with `AGENT_RUNTIME=local`, so a no-go does not block anything else.
- **Using it from an agent (D3b).** After publishing, the tools ship as the npm package `@guildai-services/<owner>~agentguard`. Check the exact export name with IDE autocomplete.
