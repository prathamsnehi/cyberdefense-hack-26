import type { AgentContext, Email } from "../server/src/contracts";
import { requireKnownPayee } from "../targets/shared/guards";

const TOOL_DEFS: any[] = [];
const ALLOWED = new Set(["payInvoice", "readLedger"]);

export async function vulnerable(email: Email, ctx: AgentContext) {
  // ruleid: agentguard.untrusted-email-to-tool-llm
  const res = await ctx.llm.chat.completions.create({
    model: ctx.model,
    tools: TOOL_DEFS,
    messages: [{ role: "user", content: `Process this invoice email:\n${email.body}` }],
  });
  for (const call of res.choices[0].message.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    // ruleid: agentguard.unchecked-tool-dispatch
    await ctx.tools[call.function.name](args);
    // ruleid: agentguard.model-chosen-payee
    await ctx.tools.payInvoice(args);
  }
}

export async function safe(email: Email, ctx: AgentContext) {
  // ok: agentguard.untrusted-email-to-tool-llm
  const summary = await ctx.llm.chat.completions.create({ model: ctx.model, messages: [{ role: "user", content: email.body }] });
  const res = await ctx.llm.chat.completions.create({ model: ctx.model, tools: TOOL_DEFS, messages: [{ role: "user", content: "Pay due invoices from the ledger." }] });
  for (const call of res.choices[0].message.tool_calls ?? []) {
    if (!ALLOWED.has(call.function.name)) continue;
    const args = JSON.parse(call.function.arguments);
    // ok: agentguard.unchecked-tool-dispatch
    await ctx.tools[call.function.name](args);
    // ok: agentguard.model-chosen-payee
    await ctx.tools.payInvoice({ account: requireKnownPayee(String(args.account), ctx.knownPayees), amount_usd: Number(args.amount_usd), memo: String(args.memo) });
  }
  return summary;
}
