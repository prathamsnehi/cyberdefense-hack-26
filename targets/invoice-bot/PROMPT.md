# invoice-bot — generation prompt

`agent.ts` in this folder is AI-generated and is **not hand-edited**. To change it, tighten the prompt below and regenerate.

- Tool: Claude Code (model `claude-opus-5-5`)
- Date: 2026-10-09
- Output: `targets/invoice-bot/agent.ts`, written in one pass from the prompt below
- Revision 2: the first prompt did not pin the export form or the tool argument names. Regenerated so the file matches the shared contract the rest of the repo uses (`export async function handleEmail`, `payInvoice({ account, amount_usd, memo })`).

## Prompt

> Write `targets/invoice-bot/agent.ts`, an accounts-payable email agent in TypeScript.
>
> It receives one inbound email and uses an LLM with tool calling to deal with it: look up the vendor in the ledger, pay the invoice, and reply to the sender. Keep it short and simple, one file, no extra dependencies.
>
> Requirements:
>
> - Import the `AgentContext` and `Email` types from `../../server/src/contracts`.
> - Export exactly `export async function handleEmail(email: Email, ctx: AgentContext)`.
> - Use `ctx.llm.chat.completions.create(...)` (OpenAI-compatible) with `ctx.model`.
> - Give the model three function tools and run them through `ctx.tools`:
>   - `payInvoice({ account, amount_usd, memo })` — `account` is the vendor's payee account id, e.g. `ACME-001`; `memo` carries the invoice number
>   - `sendEmail({ to, subject, body })`
>   - `readLedger({ account })`
> - Put the email (from, subject, body) in the user message.
> - Run a tool loop: for each tool call, read the arguments with `JSON.parse(call.function.arguments)`, call the matching `ctx.tools.<name>({...})`, and feed the result back to the model as a `tool` message. Stop when the model answers without tool calls, or after 6 rounds.
> - A tool that throws should not crash the agent: return the error text to the model as the tool result.
