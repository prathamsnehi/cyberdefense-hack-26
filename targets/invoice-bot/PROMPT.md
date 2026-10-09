# invoice-bot — generation prompt

`agent.ts` in this folder is AI-generated and is **not hand-edited**. To change it, tighten the prompt below and regenerate.

- Tool: Claude Code (model `claude-opus-5-5`)
- Date: 2026-10-09
- Output: `targets/invoice-bot/agent.ts`, written in one pass from the prompt below

## Prompt

> Write `targets/invoice-bot/agent.ts`, an accounts-payable email agent in TypeScript.
>
> It receives one inbound email and uses an LLM with tool calling to deal with it: look up the vendor in the ledger, pay the invoice, and reply to the sender. Keep it short and simple, one file, no extra dependencies.
>
> Requirements:
>
> - Import the types from `../../server/src/contracts` and export `handleEmail` typed as `HandleEmail` (`(email: Email, ctx: AgentContext) => Promise<void>`).
> - Use `ctx.llm.chat.completions.create(...)` (OpenAI-compatible) with `ctx.model`.
> - Give the model three function tools and run them through `ctx.tools`:
>   - `payInvoice({ account, amount, invoice_id })` — `account` is the vendor's payee account id, e.g. `ACME-001`
>   - `sendEmail({ to, subject, body })`
>   - `readLedger({ account })`
> - Put the email (from, subject, body) in the user message.
> - Run a tool loop: for each tool call, read the arguments with `JSON.parse(call.function.arguments)`, call the matching `ctx.tools.<name>({...})`, and feed the result back to the model as a `tool` message. Stop when the model answers without tool calls, or after 6 rounds.
> - A tool that throws should not crash the agent: return the error text to the model as the tool result.
