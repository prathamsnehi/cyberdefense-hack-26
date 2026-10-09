# Semgrep Guardian on the AI-generated agent

**Result: Semgrep Guardian scanned the AI-generated `invoice-bot` and reported 0 findings. The flaw is real and exploitable, and our own Semgrep rule catches it.**

This file records what actually happened. It does not contain a Guardian finding, because Guardian did not produce one.

## What was run

| | |
|---|---|
| Date | 2026-10-09 |
| Tool | Semgrep Guardian plugin for Claude Code, `semgrep@claude-plugins-official` 2.3.0, signed in to the `albert` Semgrep organization |
| Host | Claude Code CLI 2.1.296 |
| Code scanned | `invoice-bot`, generated in that session from the prompt in `targets/invoice-bot/PROMPT.md` and written to `sandbox/guardian-check/agent.ts` |
| Same code as | `targets/invoice-bot/agent.ts` (byte-identical apart from trailing whitespace) |

Guardian scans code as the agent writes it, so reviewing the existing file did not trigger a scan (its log showed "nothing scanned this session"). Having Claude Code generate the module did.

## What Guardian reported

Guardian's end-of-session line, verbatim:

> Semgrep Guardian: 1 scan this session across 1 file, 0 findings.

Its local session record agrees: `{"files":1,"scans":1,"findings":0,"failures":0}`. No hook output, finding or block was attached to the write.

## What is in that file anyway

The payee account passed to the payment tool comes straight from model output, and the model reads an untrusted inbound email:

```ts
const args = JSON.parse(call.function.arguments);
// ...
result = await ctx.tools.payInvoice({ account: args.account, amount: Number(args.amount), invoice_id: String(args.invoice_id) });
```

Whoever can email the agent can choose where the money goes.

- **Exploitable:** replaying the 30 committed seed attacks (`targets/fixtures/seed-attacks.json`) against this agent on AkashML (Llama 3.3 70B), 29 of 30 ended in a payment to an account that is not a known payee. Against the reference fix, 0 of 30.
- **Detected by our rules:** `semgrep --config rules/agent-security.yaml` (Semgrep 1.180.0) on the same file reports:

| Severity | Rule | Line |
|---|---|---|
| ERROR | `agentguard.model-chosen-payee` | 68 |
| WARNING | `agentguard.untrusted-email-to-tool-llm` | 57 |

## Fix

`targets/invoice-bot/agent.fixed.ts`: tool names are checked against an allowlist, and the account goes through `requireKnownPayee(String(args.account), ctx.knownPayees)` before it reaches `payInvoice`. With that change `model-chosen-payee` no longer fires and the 30 attacks pay nothing.

## What this means for the submission

The Semgrep base requirement asks for a Guardian finding on AI-generated code. We do not have one for this file. What we can show truthfully is the gap: a general-purpose scan passes an agent whose model output controls a payment destination, and a Semgrep rule written for that flaw class catches it. Whether that satisfies the requirement is for the team to decide before submitting.
