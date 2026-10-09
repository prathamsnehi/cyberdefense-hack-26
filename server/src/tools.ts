import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { insertEvents, timedQuery } from "./clickhouse";
import type { AgentEvent, ToolFn } from "./contracts";
export const toolsRouter = new Hono();
export const runContext = new Map<string, any>();
export const pending = new Map<string, (value: any) => void>();

export type GatewayContext = {
  run_id: string; agent_id: string; version: string; session_id: string;
  attack_id: string; source: AgentEvent['source']; guard: boolean; fleet?: 0 | 1;
};
export class InfrastructureError extends Error {
  readonly code = 'INFRASTRUCTURE_ERROR';
}
export class ToolBlockedError extends Error {
  readonly code = 'TOOL_BLOCKED';
  constructor(readonly event_id: string) { super('Unknown payment destination blocked'); }
}
export type GatewayStore = {
  knownPayee(agent: string, account: string): Promise<boolean>;
  write(event: AgentEvent): Promise<void>;
  find(event_id: string): Promise<AgentEvent | undefined>;
  ledger(context: GatewayContext, account: string): Promise<unknown[]>;
};
const store: GatewayStore = {
  async knownPayee(agent, account) {
    const result = await timedQuery<{ n: string }>(`SELECT count() AS n FROM payees FINAL
      WHERE agent_id = {agent:String} AND account = {account:String}`, { agent, account });
    return Number(result.rows[0]?.n) > 0;
  },
  write: e => insertEvents([e]),
  async find(event_id) {
    return (await timedQuery<AgentEvent>('SELECT * FROM agent_events WHERE event_id = {id:UUID} LIMIT 1', { id: event_id })).rows[0];
  },
  async ledger(context, account) {
    return (await timedQuery(`SELECT event_id, args, ts FROM agent_events
      WHERE agent_id = {agent:String} AND run_id = {run:String} AND tool = 'payInvoice'
      AND event_type = 'tool_call' AND JSONExtractString(args, 'account') = {account:String}
      ORDER BY ts DESC LIMIT 1 BY event_id`, { agent: context.agent_id, run: context.run_id, account })).rows;
  },
};
const text = (args: Record<string, unknown>, key: string) => {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim() || value.length > 10000) throw new Error(`Invalid ${key}`);
  return value;
};

/** The runner creates this factory; incoming tool arguments never supply trusted metadata. */
export function createToolGateway(context: GatewayContext, db: GatewayStore = store): Record<string, ToolFn> {
  for (const key of ['run_id', 'agent_id', 'version', 'session_id'] as const)
    if (!context[key] || typeof context[key] !== 'string') throw new Error(`Missing trusted ${key}`);
  if (typeof context.guard !== 'boolean' || typeof context.attack_id !== 'string' ||
      !['external', 'internal', ''].includes(context.source) ||
      (context.fleet !== undefined && context.fleet !== 0 && context.fleet !== 1)) throw new Error('Invalid trusted gateway context');
  const trusted = Object.freeze({ ...context });
  async function audit(tool: string, args: Record<string, unknown>, blocked = false, newPayee: 0 | 1 = 0, guard_ms: number | null = null) {
    const event: AgentEvent = { event_id: randomUUID(), run_id: trusted.run_id, agent_id: trusted.agent_id,
      version: trusted.version, session_id: trusted.session_id, attack_id: trusted.attack_id,
      source: trusted.source, fleet: trusted.fleet ?? 0, tool, args: JSON.stringify(args),
      event_type: blocked ? 'tool_blocked' : 'tool_call', is_new_payee: newPayee, guard_ms };
    try { await db.write(event); }
    catch {
      // A timeout can mean the write committed. Reconcile the SAME ID without retrying it.
      let saved: AgentEvent | undefined;
      try { saved = await db.find(event.event_id!); } catch { /* still uncertain */ }
      if (!saved || saved.run_id !== event.run_id || saved.agent_id !== event.agent_id ||
          saved.event_type !== event.event_type || saved.tool !== event.tool || saved.args !== event.args)
        throw new InfrastructureError(`Audit write unconfirmed; event_id=${event.event_id}`);
    }
    if (blocked) throw new ToolBlockedError(event.event_id!);
    return JSON.stringify({ ok: true, sandbox: true, event_id: event.event_id, run_id: trusted.run_id,
      tool, ...args });
  }
  return {
    async payInvoice(args) {
      const account = text(args, 'account'), invoice_id = text(args, 'invoice_id');
      const amount = args.amount;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1e9 ||
          Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) throw new Error('Invalid USD amount');
      const start = performance.now();
      let known: boolean;
      try { known = await db.knownPayee(trusted.agent_id, account); }
      catch { throw new InfrastructureError('Authoritative payee lookup failed'); }
      return audit('payInvoice', { account, amount, invoice_id }, trusted.guard && !known,
        known ? 0 : 1, trusted.guard ? performance.now() - start : null);
    },
    async readLedger(args) {
      const account = text(args, 'account');
      let entries: unknown[];
      try { entries = await db.ledger(trusted, account); }
      catch { throw new InfrastructureError('Ledger read failed'); }
      const receipt = JSON.parse(await audit('readLedger', { account }));
      return JSON.stringify({ ...receipt, entries });
    },
    async sendEmail(args) {
      const to = text(args, 'to'), subject = text(args, 'subject'), body = text(args, 'body');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Invalid email destination');
      // The acknowledged event is the sandbox outbox action, just as for the ledger.
      return audit('sendEmail', { to, subject, body });
    },
  };
}
export const toolGateway = createToolGateway;
