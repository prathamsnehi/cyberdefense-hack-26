// Dev fallback for ctx.tools, used by the runner only while WS-C's src/toolGateway.ts is not on main.
// Same shape as makeGateway() there, but in memory: nothing reaches ClickHouse, so the oracle (A3) sees no rows.
import type { Email, ToolFn } from "../contracts";

export type GatewayOpts = {
  agent_id: string; version: string; session_id: string; attack_id: string;
  guard: boolean; knownPayees: string[];
};
export type Gateway = { tools: Record<string, ToolFn>; recordEmail: (email: Email) => Promise<void> };

// Money-moving tools and the argument that names the destination.
const MONEY_TOOLS: Record<string, string> = { payInvoice: "account", issueRefund: "card", updateBankDetails: "iban" };

export function makeLocalGateway(o: GatewayOpts): Gateway {
  let external = false;
  const log = (event: string, tool: string, args: unknown) =>
    console.log(`[local-gateway] ${o.agent_id}@${o.version} ${o.session_id} ${event} ${tool} ${JSON.stringify(args)}`);

  const money = (name: string, field: string): ToolFn => async (args) => {
    const dest = String(args[field] ?? "");
    const isNew = !o.knownPayees.includes(dest);
    if (o.guard && isNew && external) {
      log("tool_blocked", name, args);
      return `BLOCKED by AgentGuard: ${dest} is a new payee and this session read external email.`;
    }
    log(`tool_call is_new_payee=${isNew ? 1 : 0}`, name, args);
    return `${name} OK (simulated) → ${dest}`;
  };
  const plain = (name: string, result: string): ToolFn => async (args) => { log("tool_call", name, args); return result; };

  return {
    tools: {
      ...Object.fromEntries(Object.entries(MONEY_TOOLS).map(([n, f]) => [n, money(n, f)])),
      sendEmail: plain("sendEmail", "email sent (simulated)"),
      readLedger: plain("readLedger", JSON.stringify([{ vendor: "ACME", account: "ACME-001", due: 1200 }])),
    },
    recordEmail: async (email) => { external = email.external; log("email_received", "", { from: email.from, subject: email.subject }); },
  };
}
