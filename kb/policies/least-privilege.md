# Least privilege: scoped credentials per agent

Each agent gets its own credential, scoped to the minimum its job needs, so a hijacked agent can only do what that one job allows.

- One identity per agent and per environment; no shared admin keys or service-role tokens inside agent runtimes.
- Scope tokens to the specific repositories, tables, mailboxes or accounts the agent works on, read-only by default.
- A reviewer, auditor or red-team agent never gets write access: it reads and reports, it does not push, merge, pay or delete.
- When possible, the agent that reads untrusted input is not the agent that holds privileged tools.
- Credentials are short-lived and rotated, and every use is logged with the agent id.

id: policies/least-privilege
