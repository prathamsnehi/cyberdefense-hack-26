# AWS-41: environment setup

The backend uses Neon AI Gateway for the fixer, rule writer, and (by default)
the target agent and attack generation. The OpenAI SDK is an API-compatible
client pointed at the Neon branch; no OpenAI API key or direct OpenAI endpoint
is used. The older `openai` export aliases the same Neon client so sibling
workstreams can keep importing it.

## Local development

Install server dependencies, copy `.env.example` to the repo-root `.env`, and
fill `AGENTGUARD_API_KEY`, `NEON_AI_GATEWAY_TOKEN`,
`NEON_AI_GATEWAY_BASE_URL`, `CLICKHOUSE_URL`, and `CLICKHOUSE_PASSWORD`.
`AGENTGUARD_API_KEY` should be a random application key shared with authorized
callers. `server/src/env.ts` loads the root file regardless of the working directory.

Neon expects the bare branch HTTPS host in `NEON_AI_GATEWAY_BASE_URL`.
The client appends `/v1` for chat completions. Obtain both URL and token from
Neon's branch credentials or `neon env pull`. Set `NEON_MODEL`,
`NEON_FAST_MODEL`, and `NEON_TARGET_MODEL` to model IDs available in that branch's
catalog. Defaults are `gpt-5`, `gpt-5-mini`, and `gpt-5-mini`, all served through
Neon. `TARGET_PROVIDER=akash` instead requires `AKASHML_API_KEY`; the supplied
`AKASH_API_KEY` name is also accepted.

```sh
cd server
npm ci
npm run dev
# In a separate terminal:
curl --fail http://127.0.0.1:8787/health
```

Expect `{"ok":true}`. This endpoint verifies server startup, not external
service connectivity. Model calls and ClickHouse authentication must be
verified separately. Some modules belong to other workstreams and may not
have landed yet; their routes return 503 until they do.

## GitHub Actions repository secrets

The synchronization command reads the ignored local file with dotenv parsing.
It uploads nonempty known names to **Actions repository secrets** for
`GITHUB_REPO`, using stdin so values do not appear in command arguments or logs.
It requires all five startup values before writing anything.

```sh
cd server
npm run secrets:sync -- --check       # Print planned names only.
npm run secrets:sync                 # Upload .env values.
npm run secrets:sync -- /path/to/.env # Use a different local file.
gh secret list -R prathamsnehi/cyberdefense-hack-26
```

GitHub reserves the `GITHUB_` prefix for built-in settings. The command stores
a local `GITHUB_TOKEN` as `GH_APP_TOKEN` and `GITHUB_REPO` as `GH_REPO_NAME`.
The application accepts both aliases. Actions can use its built-in
`${{ github.token }}` and `${{ github.repository }}` when a job needs GitHub
access. No personal GitHub token is required for tests or `/health`.

`Server checks` runs offline tests on PRs and pushes. On `main` it also starts
the server with the required repository secrets and checks `/health`.
The configured health job never injects real secrets into PR code.
Other jobs must explicitly map any optional sponsor secrets they use into
the job's `env`; storing a repository secret alone does not inject it.

## Deployment

No deploy host is configured by this change. Before deploying, populate the
same required names in the host's Preview and Production environment stores.
Use branch-specific Neon credentials/URLs where previews have their own Neon
branch. Keep all credentials on the backend; never expose them through public
frontend variables. A root `.env` and Actions secrets do not configure a deploy
host automatically.

## Exposed ClickHouse credential

`sponsor-service-credentials.md` is removed from the working tree and ignored.
`.env` and `.env.*` are ignored except the placeholder `.env.example`.
The old credential remains in Git history, so deletion does not revoke it.

Rotate it through ClickHouse Cloud's password reset (or an authorized Cloud
API credential), update local `.env`, rerun secret synchronization, and update
any existing deployment stores. Confirm the new credential authenticates and
the old one is rejected. The supplied `default` database credential has no
`ALTER USER` privilege; SQL authentication alone cannot reset its password.

References:
- [Neon gateway configuration](https://neon.com/blog/llms-belong-in-your-backend)
- [ClickHouse Cloud password reset](https://clickhouse.com/docs/cloud/security/secure-your-service)
