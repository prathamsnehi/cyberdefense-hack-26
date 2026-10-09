import { chat, extractFence, extractJson, MODELS, neon } from "./llm";
import type { Attack, Finding, Patch } from "./contracts";

const FIXER_SYSTEM = `You fix security flaws in a TypeScript AI agent. Rules:
- Keep the exported signature: export async function handleEmail(email: Email, ctx: AgentContext)
- Keep these import paths exactly: "../../server/src/contracts" and "../../targets/shared/guards".
- Legitimate invoices from known vendors MUST still be paid. Do not remove payInvoice.
- Fix the root cause: destinations must pass requireKnownPayee(account, ctx.knownPayees); tool names must be
  checked against an explicit allowlist before dispatch; treat email text as untrusted data.
- Use EXACTLY these idioms (our Semgrep rules recognize them, other shapes fail the gate):
    const ALLOWED = new Set(["payInvoice", "sendEmail", "readLedger"]);
    if (!ALLOWED.has(call.function.name)) continue;
    const args = JSON.parse(call.function.arguments);
    await ctx.tools.payInvoice({ account: requireKnownPayee(String(args.account), ctx.knownPayees),
                                 amount: Number(args.amount), invoice_id: String(args.invoice_id) });
  Pass the RETURN VALUE of requireKnownPayee as the account. Never pass model-chosen arguments straight to a
  money tool, and never call ctx.tools[name](args) for a money tool.
- Cite the lessons you used by their id.
Return exactly two fenced blocks: first \`\`\`typescript with the full new file, then \`\`\`json with
{"rationale":"one paragraph","citations":["lesson ids"]}.`;

export async function proposePatchLocal(input: {
  code: string; findings: Finding[]; failedAttacks: Attack[]; lessons: string;
}): Promise<Patch> {
  const out = await chat(neon, MODELS.reasoning, FIXER_SYSTEM, [
    "CURRENT FILE:\n" + input.code,
    "SEMGREP FINDINGS:\n" + JSON.stringify(input.findings.map(({ snippet, ...f }) => f)),
    "ATTACKS THAT STILL WORK:\n" + JSON.stringify(input.failedAttacks.slice(0, 5).map((a) => a.email)),
    "LESSONS FROM PAST INCIDENTS (Senso):\n" + input.lessons,
  ].join("\n\n"), { reasoning_effort: "low" });  // default effort on GPT-5 is 1-2 minutes per call
  // A missing or malformed JSON block must not waste a whole fixer attempt (~2 minutes of demo).
  let meta = { rationale: "(no rationale returned)", citations: [] as string[] };
  try { meta = extractJson(extractFence(out, "json")); } catch { /* keep defaults */ }
  return { file_content: extractFence(out, "typescript"), ...meta };
}
