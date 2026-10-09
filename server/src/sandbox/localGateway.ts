// Dev fallback for ctx.tools: the same tool names and argument checks as createToolGateway() in src/tools.ts, but
// in memory. Nothing reaches ClickHouse, so the oracle (A3) sees no rows. Start the runner with `--gateway local`.
import type { AgentEvent, ToolFn } from "../contracts";

export type GatewayContext = {
  run_id: string; agent_id: string; version: string; session_id: string;
  attack_id: string; source: AgentEvent["source"]; guard: boolean;
};

const text = (args: Record<string, unknown>, key: string) => {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${key}`);
  return value;
};

export function createLocalGateway(o: GatewayContext, knownPayees: string[]): Record<string, ToolFn> {
  const log = (event: string, tool: string, args: unknown) =>
    console.log(`[local-gateway] ${o.agent_id}@${o.version} ${o.session_id} ${event} ${tool} ${JSON.stringify(args)}`);
  return {
    async payInvoice(args) {
      const account = text(args, "account"), invoice_id = text(args, "invoice_id");
      const amount = args.amount;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) throw new Error("Invalid USD amount");
      const isNew = !knownPayees.includes(account);
      if (o.guard && isNew) {
        log("tool_blocked", "payInvoice", args);
        throw Object.assign(new Error("Unknown payment destination blocked"), { code: "TOOL_BLOCKED" });
      }
      log(`tool_call is_new_payee=${isNew ? 1 : 0}`, "payInvoice", { account, amount, invoice_id });
      return JSON.stringify({ ok: true, sandbox: true, tool: "payInvoice", account, amount, invoice_id });
    },
    async readLedger(args) {
      const account = text(args, "account");
      log("tool_call", "readLedger", { account });
      return JSON.stringify({ ok: true, sandbox: true, tool: "readLedger", account, entries: [] });
    },
    async sendEmail(args) {
      const to = text(args, "to"), subject = text(args, "subject"), body = text(args, "body");
      log("tool_call", "sendEmail", { to, subject });
      return JSON.stringify({ ok: true, sandbox: true, tool: "sendEmail", to, subject, body });
    },
  };
}
