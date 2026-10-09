# Semgrep Guardian on this repo's AI-written code

**Result: Guardian reported one finding, on `targets/invoice-bot/agent.fixed.ts` line 60. It reported nothing on the vulnerable `invoice-bot` itself; our own Semgrep rule is what catches that flaw.**

This file records what Guardian actually said, including what it missed and where its one finding does not apply as worded.

## Setup

| | |
|---|---|
| Date | 2026-10-09 |
| Tool | Semgrep Guardian plugin for Claude Code, `semgrep@claude-plugins-official` 2.3.0, signed in to the `albert` Semgrep organization |
| Host | Claude Code CLI 2.1.296 |
| How | Guardian scans files as the agent writes them, so reviewing an existing file scans nothing. Each file below was written by Claude Code into `sandbox/guardian-check/` (git-ignored) with Guardian active. |

## Run 1: the vulnerable agent — 0 findings

Claude Code generated `invoice-bot` from the prompt in `targets/invoice-bot/PROMPT.md`. The result is the same code as `targets/invoice-bot/agent.ts`.

Guardian, verbatim:

> Semgrep Guardian: 1 scan this session across 1 file, 0 findings.

## Run 2: three more files — 1 finding

Claude Code wrote byte-for-byte copies of `server/src/llm.ts`, `server/src/bus.ts` and `targets/invoice-bot/agent.fixed.ts`.

Guardian, verbatim:

> Semgrep Guardian: 3 scans this session across 3 files, 1 finding.

Nothing was attached to `llm.ts` or `bus.ts`. For `agent.fixed.ts` the write was blocked with:

> semgrep found 1 issue(s) in agent.fixed.ts:
>
> [WARNING] javascript.express.security.injection.raw-html-format.raw-html-format
> sandbox/guardian-check/agent.fixed.ts:60 - User data flows into the host portion of this manually-constructed HTML. This can introduce a Cross-Site-Scripting (XSS) vulnerability if this comes from user-provided input. Consider using a sanitization library such as DOMPurify to sanitize the HTML within.

### The finding

| | |
|---|---|
| Rule | `javascript.express.security.injection.raw-html-format.raw-html-format` (WARNING) |
| File | `targets/invoice-bot/agent.fixed.ts`, line 60 |
| Fix Guardian proposed | Sanitize the HTML with a library such as DOMPurify |

The flagged line:

```ts
{ role: "user", content: `Inbound email (untrusted):\n<email>\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}\n</email>` },
```

### How to read it

- **The data flow is real.** Text from an inbound email, which anyone can send, is interpolated into a string between tags.
- **The stated risk does not apply.** The string is a prompt sent to an LLM, not HTML rendered in a browser, so there is no XSS here and DOMPurify would not help.
- **What the same flow does mean in this code** is prompt injection: an email can contain `</email>` and continue with text that looks like instructions. The reference fix does not rely on the tags for safety; the payee is checked in code with `requireKnownPayee`, which is why 0 of the 30 seed attacks get a payment through.
- **Provenance.** `agent.fixed.ts` was written with Claude Code. Its header comment and the plan call it the "hand-written reference fix". The team should use one description consistently.

## What Guardian did not report

The flaw the project is about, in `targets/invoice-bot/agent.ts`: the payee account passed to the payment tool comes straight from model output, and the model reads an untrusted email.

```ts
result = await ctx.tools.payInvoice({ account: args.account, amount: Number(args.amount), invoice_id: String(args.invoice_id) });
```

- **Exploitable:** replaying the 30 seed attacks (`targets/fixtures/seed-attacks.json`) on AkashML (Llama 3.3 70B), 29 of 30 ended in a payment to an account that is not a known payee. Against the reference fix, 0 of 30.
- **Detected by our rules:** `semgrep --config rules/agent-security.yaml` (Semgrep 1.180.0) reports `agentguard.model-chosen-payee` (ERROR, line 68) and `agentguard.untrusted-email-to-tool-llm` (WARNING, line 57).

## For the submission

There is one genuine Guardian finding on AI-written code in this repo, with the caveats above. The stronger and fully accurate story is the contrast: a general-purpose scan flags a string that looks like HTML and passes the agent whose model output controls a payment destination, while a Semgrep rule written for that flaw class catches it.
