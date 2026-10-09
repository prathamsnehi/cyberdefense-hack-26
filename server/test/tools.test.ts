import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/clickhouse', () => ({ insertEvents: vi.fn(), timedQuery: vi.fn() }));
import { createToolGateway, InfrastructureError, ToolBlockedError, type GatewayContext, type GatewayStore } from '../src/tools';
import type { AgentEvent } from '../src/contracts';
const context: GatewayContext = { run_id: 'run1', agent_id: 'invoice-bot', version: 'v1', session_id: 'session1', attack_id: 'attack1', source: 'external', guard: true };
const args = { account: 'ACME-001', amount: 25.50, invoice_id: 'INV-1' };
function memory() {
  const rows: AgentEvent[] = [];
  const db: GatewayStore = {
    knownPayee: vi.fn(async (agent, account) => agent === 'invoice-bot' && account === 'ACME-001'),
    write: vi.fn(async event => { rows.push(event); }),
    find: vi.fn(async id => rows.find(e => e.event_id === id)),
    ledger: vi.fn(async (ctx, account) => rows.filter(e => e.agent_id === ctx.agent_id && e.run_id === ctx.run_id && JSON.parse(e.args).account === account)),
  };
  return { db, rows };
}
describe('trusted sandbox gateway', () => {
  it('legitimate invoice commits one correlated receipt and ignores argument metadata', async () => {
    const { db, rows } = memory();
    const tools = createToolGateway(context, db);
    const receipt = JSON.parse(await tools.payInvoice({ ...args, agent_id: 'other', guard: false, run_id: 'other' }));
    expect(receipt).toMatchObject({ ok: true, sandbox: true, run_id: 'run1', amount: 25.50 });
    expect(rows).toHaveLength(1);
    const { guard: _guard, ...correlation } = context;
    expect(rows[0]).toMatchObject({ ...correlation, event_id: receipt.event_id, event_type: 'tool_call', is_new_payee: 0, tool: 'payInvoice' });
    expect(rows[0].guard_ms).toBeGreaterThanOrEqual(0);
  });
  it('unknown account is executable only with guard off, which remains unmeasured', async () => {
    const { db, rows } = memory();
    const unknown = { ...args, account: 'ATTACKER' };
    await expect(createToolGateway(context, db).payInvoice(unknown)).rejects.toBeInstanceOf(ToolBlockedError);
    expect(rows[0]).toMatchObject({ event_type: 'tool_blocked', is_new_payee: 1 });
    await createToolGateway({ ...context, guard: false }, db).payInvoice(unknown);
    expect(rows[1]).toMatchObject({ event_type: 'tool_call', is_new_payee: 1, guard_ms: null });
  });
  it('does not reuse another agent payee or permit mutated trusted context', async () => {
    const { db, rows } = memory();
    const ctx = { ...context, agent_id: 'other-agent' };
    const tools = createToolGateway(ctx, db);
    ctx.agent_id = 'invoice-bot';
    await expect(tools.payInvoice(args)).rejects.toBeInstanceOf(ToolBlockedError);
    expect(rows[0].agent_id).toBe('other-agent');
  });
  it.each([0, -1, NaN, Infinity, '25', 0.001])('rejects malformed amounts %s without an action', async amount => {
    const { db, rows } = memory();
    await expect(createToolGateway(context, db).payInvoice({ ...args, amount })).rejects.toThrow('amount');
    expect(rows).toHaveLength(0);
  });
  it('lookup and unconfirmed audit failures cannot acknowledge a payment', async () => {
    const { db } = memory();
    vi.mocked(db.knownPayee).mockRejectedValueOnce(new Error('offline'));
    await expect(createToolGateway(context, db).payInvoice(args)).rejects.toBeInstanceOf(InfrastructureError);
    expect(db.write).not.toHaveBeenCalled();
    vi.mocked(db.write).mockRejectedValueOnce(new Error('timeout'));
    await expect(createToolGateway(context, db).payInvoice(args)).rejects.toBeInstanceOf(InfrastructureError);
    expect(db.write).toHaveBeenCalledOnce();
    expect(db.find).toHaveBeenCalledOnce();
  });
  it('reconciles an acknowledged-by-storage ambiguous write without inserting twice', async () => {
    const { db, rows } = memory();
    vi.mocked(db.write).mockImplementationOnce(async e => { rows.push(e); throw new Error('response lost'); });
    const receipt = JSON.parse(await createToolGateway(context, db).payInvoice(args));
    expect(receipt.ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(db.write).toHaveBeenCalledOnce();
  });
  it('an ambiguous block stays blocked, and an unreconciled block is infrastructure failure', async () => {
    const { db, rows } = memory();
    vi.mocked(db.write).mockImplementationOnce(async e => { rows.push(e); throw new Error('response lost'); });
    await expect(createToolGateway(context, db).payInvoice({ ...args, account: 'UNKNOWN' })).rejects.toBeInstanceOf(ToolBlockedError);
    vi.mocked(db.write).mockRejectedValueOnce(new Error('not committed'));
    await expect(createToolGateway(context, db).payInvoice({ ...args, account: 'UNKNOWN' })).rejects.toBeInstanceOf(InfrastructureError);
  });
  it('audits sandbox outbox and ledger tools without payment latency measurements', async () => {
    const { db, rows } = memory();
    const tools = createToolGateway(context, db);
    await tools.payInvoice(args);
    const ledger = JSON.parse(await tools.readLedger({ account: args.account }));
    expect(ledger.entries).toHaveLength(1);
    const receipt = JSON.parse(await tools.sendEmail({ to: 'team@example.com', subject: 'receipt', body: '<script>untrusted</script>' }));
    expect(receipt.sandbox).toBe(true);
    expect(rows.slice(1).map(e => e.guard_ms)).toEqual([null, null]);
  });
});
