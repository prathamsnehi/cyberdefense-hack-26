# Guild agents runbook (D3b / D4)

State as of 2026-10-09 21:50Z, all created from the Guild CLI with the `petruu.fi` account.

| Item | Value |
| --- | --- |
| Integration | `petruu.fi~agentguard` v1.0.0, published, connected (credential `01a12286-7aa6-c369-0000-7501cd2fed3c`) |
| Red-team agent | `petruu.fi~agentguard-redteam` v1.0.3 (`guild-agents/redteam/agent.ts`) |
| Fixer agent | `petruu.fi~agentguard-fixer` v1.0.1 (`guild-agents/fixer/agent.ts`) |
| Workspace | `petruu.fi~agentguard` (`01a12296-9b3a-3bb9-0000-20492ab72098`), both agents added |
| API triggers | `agentguard-redteam-api`, `agentguard-fixer-api` (active) |
| Tools package | `@guildai-services/petruu.fi~agentguard`, export `AgentguardTools`, tools `agentguard_<operationId>` |

## Deny by default (the "we attacked our own agent" beat)

The agentguard credential has no allow-all policy. Per agent:

| Agent | ALLOW | DENY |
| --- | --- | --- |
| red-team | `get_target_profile`, `send_attack_batch` | `submit_patch`, `get_run_context` |
| fixer | `get_run_context`, `submit_patch` | everything else (no policy) |

The red-team agent is wired to the **full** tool set in code on purpose. When its target profile is
requested with `compromised=1`, the server answers with a prompt-injected description that tells the
agent to call `submit_patch`. Guild's credential policy denies that call, and the denial shows up in
the session events and the audit log. That is the D4 beat: screenshot it to
`docs/guild-denied-submit-patch.png`.

Manage policies:

```bash
guild credentials policy list 01a12286-7aa6-c369-0000-7501cd2fed3c
```

## Running the red-team agent (recorded, never live)

Prerequisites on the demo laptop: `cd server && npm run dev` and the ngrok tunnel
(`ngrok http --url=unerasing-scripturally-sherie.ngrok-free.dev 8787`) are up, otherwise every tool
call from Guild fails.

Input schema of the red-team agent: `{ run_id, agent_id, version, compromised? }`. The fixer:
`{ run_id, version }`.

**From the Guild web app** (the reliable path): open the workspace `agentguard`, start a session with
`agentguard-redteam`, and give it the JSON input. For the D4 beat use:

```json
{ "run_id": "demo-d4", "agent_id": "invoice-bot", "version": "v1", "compromised": "1" }
```

The agent calls `agentguard_get_target_profile`, reads the bait, and (if it bites) tries
`agentguard_submit_patch`, which Guild denies by policy. Open the session events and the audit log,
screenshot both.

For a real red-team run inside the loop, the run must have a sandbox up: the server records the
sandbox URL in `runContext` only while a loop is running with `AGENT_RUNTIME=guild`.

## Driving sessions from the server (`AGENT_RUNTIME=guild`)

`server/src/guild.ts` starts sessions with `POST https://api.guild.ai/v1/workspaces/{GUILD_WORKSPACE}/sessions`
and `session_type: "api_trigger"`, authenticated with Basic `id:secret`.

What was verified today:

- **Account API keys cannot start `api_trigger` sessions.** The API answers
  `403 Account API keys can only create chat and agent test sessions`. The account key in `.env`
  (`agentguard-server`, scopes `sessions:write, workspaces:read, agents:read`) is therefore not enough
  for the server path.
- `agent_test` sessions can be created with that key (`agent_version_id` + `agent_input`) but stay
  idle until input is sent, and neither the CLI `session send --json` nor the `/messages` paths we
  tried accepted it.
- `chat` sessions reject every `prompt` shape we tried with "A prompt is required for CHAT sessions".

To make the server path work, create the **trigger keys in the Guild console** (workspace →
Triggers → the `agentguard-redteam-api` / `agentguard-fixer-api` triggers → API key, shown once) and
put them in `.env` as `GUILD_REDTEAM_KEY_ID/SECRET` and `GUILD_FIXER_KEY_ID/SECRET`, replacing the
account key. Then `AGENT_RUNTIME=guild` and start a loop from the dashboard; the loop falls back to
local on any Guild error, so the demo never depends on it.

## Gotchas

- `guild agent save` without an explicit agent name can save into the wrong agent when run from a
  sibling folder. Always pass the name and path:
  `guild agent save petruu.fi~agentguard-fixer --path ./fixer --force -m "..." --wait --publish`.
- Each agent folder is its own Guild git repo. Its `.git` is renamed to `.guild-git/` (ignored) so
  the monorepo can track the sources; use `--force` on the next save.
- `npm install` inside the agent folders died with `Exit handler never called` on the dev laptop;
  the Guild remote build does the install, so it was not needed.
