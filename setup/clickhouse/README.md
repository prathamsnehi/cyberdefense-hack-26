# Albert AI: ClickHouse handoff

Verified on October 9, 2026. No software was installed on the personal Mac.

## Current service

| Field | Value |
| --- | --- |
| Service | albert-ai |
| Provider / region | AWS / Oregon (us-west-2) |
| Service ID | 370e9f11-726a-41ec-b854-09f578cb7f9a |
| HTTPS URL | https://s56hhdaxp4.us-west-2.aws.clickhouse.cloud:8443 |
| Database | albert |
| Event table | albert.agent_events |
| Existing database user tested | default |
| Network access | Any IP; authenticated HTTPS connections required |
| Scoped users | Prepared, not created |

Credentials stay in the existing private sponsor credentials file or Codespaces
secrets. Do not copy passwords into this guide, query files, frontend code, or Git.
The existing sponsor-service-credentials.md file is already tracked by Git;
moving secrets out of it and removing it from tracking is still needed before
sharing or pushing that file. Ignoring a file does not untrack it or erase history.

## Completed

- Created albert.agent_events through the logged-in Chrome SQL Console.
- Authenticated to the direct HTTPS database endpoint with the existing credential.
- Inserted and read back exactly one synthetic event.
- Displayed the event in the SQL Console.
- Saved the console query as Albert AI — setup verification.
- Stored the applied schema in 001_agent_events.sql.

Verified run ID: setup-smoke-db8e65f0-bdea-4e63-8b5a-f25fc2ec58e5.

## Teammate configuration

Use .env.example for non-secret settings. Map CLICKHOUSE_URL to the Node client
`url` option; map CLICKHOUSE_USER, CLICKHOUSE_PASSWORD and CLICKHOUSE_DATABASE
to `username`, `password`, and `database` respectively. For Python/MCP, use the
hostname without https:// plus port 8443 and TLS enabled.

Do not pass the existing default/admin credential to the target agent. The
proposed albert_writer user receives SELECT and INSERT on agent_events; the
proposed albert_reader user receives SELECT only. Neither proposal includes DDL
or permission-administration access. Review 002_scoped_users.pending.sql before
creating those persistent credentials.

## Smoke test (in a Codespace)

Python standard library only, no dependencies required. With connection values
available in the environment:

```bash
python3 setup/clickhouse/smoke_test.py
```

Alternatively, with the existing private Markdown credentials file:

```bash
python3 setup/clickhouse/smoke_test.py --credentials-file sponsor-service-credentials.md
```

The script writes one synthetic setup_smoke_test event. Use a writer credential
for this insert/read test, not the read-only dashboard/MCP credential. The
script does not automatically load a .env file.

## Event contract

Each event has a server-generated event_id and UTC event_time. Required input
fields are run_id, agent_id and event_type. Remaining fields have defaults.
Use one stable run_id across the attacker, defender and target. Record attempted
actions as well as successful actions. Set decision to allow or deny and preserve
source_id so a tool call can be traced to the external input that triggered it.
Store redacted structured JSON in the details string, never raw credentials.

For attack metrics, emit one attack_result per attempt: success means the target
was exploited, failure means the attack did not succeed, and error means the
result was inconclusive. Do not count infrastructure errors as blocked attacks.
queries.sql contains the three initial dashboard queries; these are not alerts
or enforcement. Blocking must happen in Guild or the tool authorization layer.

## Still needed

- Approval to create persistent scoped writer and reader credentials, then test
  their positive and negative permissions.
- Team Codespaces and backend public egress IPs before replacing the existing
  any-IP network setting. Codespaces egress may change; test from the actual
  teammate/deployment environment after any restriction.
- A connection smoke test from each teammate's environment. Current remote test
  was made from the assistant's execution environment.
- Console invitations require the teammates' actual identities; no invitations
  have been sent.

## Documentation

- [ClickHouse client and HTTPS details](https://clickhouse.com/docs/integrations/javascript)
- [Official ClickHouse MCP server](https://github.com/ClickHouse/mcp-clickhouse)
