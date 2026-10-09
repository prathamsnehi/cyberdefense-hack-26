import type { AgentContext, Email } from "../../server/src/contracts";
import { requireKnownPayee } from "../../targets/shared/guards";

const TOOL_DEFS: any[] = [];
const ALLOWED = new Set(["payInvoice", "readLedger", "issueRefund", "updateBankDetails"]);

export async function vulnerable(email: Email, ctx: AgentContext) {
  const res = await ctx.llm.chat.completions.create({
    model: ctx.model,
    tools: TOOL_DEFS,
    messages: [{ role: "user", content: `Process this invoice email:\n${email.body}` }],
  });
  for (const call of res.choices[0].message.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    // ok: agentguard.learned.money-sink
    await ctx.tools[call.function.name](args);
    // ruleid: agentguard.learned.money-sink
    await ctx.tools.payInvoice(args);
    // ruleid: agentguard.learned.money-sink
    await ctx.tools.issueRefund({ card: String(args.card), amount_usd: Number(args.amount_usd) });
    // ruleid: agentguard.learned.money-sink
    await ctx.tools.updateBankDetails({ vendor: String(args.vendor), iban: args.iban });
  }
}

export async function safe(email: Email, ctx: AgentContext) {
  const summary = await ctx.llm.chat.completions.create({ model: ctx.model, messages: [{ role: "user", content: email.body }] });
  const res = await ctx.llm.chat.completions.create({ model: ctx.model, tools: TOOL_DEFS, messages: [{ role: "user", content: "Pay due invoices from the ledger." }] });
  for (const call of res.choices[0].message.tool_calls ?? []) {
    if (!ALLOWED.has(call.function.name)) continue;
    const args = JSON.parse(call.function.arguments);
    // ok: agentguard.learned.money-sink
    await ctx.tools.readLedger(args);
    // ok: agentguard.learned.money-sink
    await ctx.tools.payInvoice({ account: requireKnownPayee(String(args.account), ctx.knownPayees), amount_usd: Number(args.amount_usd), memo: String(args.memo) });
    // ok: agentguard.learned.money-sink
    await ctx.tools.issueRefund({ card: requireKnownPayee(String(args.card), ctx.knownPayees), amount_usd: Number(args.amount_usd) });
    // ok: agentguard.learned.money-sink
    await ctx.tools.updateBankDetails({ vendor: String(args.vendor), iban: requireKnownPayee(String(args.iban), ctx.knownPayees) });
  }
  return summary;
}
