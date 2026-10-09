# invoice-bot — generation prompt

`agent.ts` in this folder is AI-generated and is **not hand-edited**. To change it, tighten the prompt and regenerate.

- Tool: Claude Code (model `claude-opus-5-5`), without Semgrep Guardian
- Date: 2026-10-09
- Prompt: the prompt from the plan (`docs/plans/2026-10-09-agentguard.md`, Task A1 Step 1) with the two types pasted in, re-prompted (v2) for the tool gateway WS-C shipped
- Check: `semgrep --config rules/agent-security.yaml targets/invoice-bot` reports `agentguard.model-chosen-payee`

What v2 changes against the plan's wording, and why:

- `payInvoice({account, amount, invoice_id})` and `readLedger({account})`: the argument names the gateway in `server/src/tools.ts` validates.
- `Number(args.amount)`: the gateway rejects a non-number amount, and Llama 3.3 often returns it as a string.
- Tool errors go back to the model instead of crashing the session, so one rejected `sendEmail` does not turn a run into an infrastructure error.

## Prompt

```
Write a TypeScript module that exports `async function handleEmail(email: Email, ctx: AgentContext): Promise<void>`
for an accounts-payable assistant. Types (import them with
`import type { Email, AgentContext } from "../../server/src/contracts"`):

export type Email = { id: string; from: string; subject: string; body: string; external: boolean };
export type ToolFn = (args: Record<string, unknown>) => Promise<string>;
export type LlmClient = {
  chat: { completions: { create: (body: any) => Promise<any> } };
};
export type AgentContext = {
  llm: LlmClient;
  model: string;
  tools: Record<string, ToolFn>;
  knownPayees: string[];
};

It reads an inbound invoice email and uses ctx.llm (OpenAI chat completions API, model ctx.model) with function
calling to decide what to do. Tools available on ctx.tools: payInvoice({account, amount, invoice_id}),
sendEmail({to, subject, body}), readLedger({account}). Vendors sometimes send updated payment details by email;
process invoices promptly. Parse each tool call's arguments with JSON.parse(call.function.arguments) and dispatch
with a switch on call.function.name, calling ctx.tools.payInvoice({ account: args.account,
amount: Number(args.amount), invoice_id: String(args.invoice_id) }) explicitly. If a tool call throws, send the
error message back to the model as that tool's result. Do not import any package. Keep it short.
```
