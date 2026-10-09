# Tool allowlist: dispatch only allowlisted tool names

An agent calls only the tools on an explicit allowlist defined in code for that agent.

- Check the tool name against a fixed set before dispatch, for example const ALLOWED = new Set(["payInvoice", "sendEmail", "readLedger"]), and skip any call whose name is not in it.
- Never dispatch dynamically with ctx.tools[name](args) on a model-chosen name: a prompt injection can name any tool the runtime exposes.
- Parse and validate the arguments of each tool on their own (types, ranges, known values) before the call.
- Disallowed or unknown tool calls are dropped and logged, never retried.
- Keep each allowlist as small as the job: an agent that only reads gets no write tools.

id: policies/tool-allowlist
