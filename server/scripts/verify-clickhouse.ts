import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ch, insertEvents, timedQuery } from '../src/clickhouse';
import { createToolGateway, ToolBlockedError } from '../src/tools';
import { metrics, fleetHunt, logicalEventCount } from '../src/queries';

// Run only in Codespaces with private credentials. This adds labelled sandbox evidence;
// it never removes the existing table or its rows and never calls a payment provider.
try {
  const before = (await timedQuery<{ event_id: string }>('SELECT event_id FROM agent_events')).rows;
  const sql = await readFile(new URL('../schema/003_application.sql', import.meta.url), 'utf8');
  const apply = async () => { for (const query of sql.split(';').map(s => s.trim()).filter(Boolean)) await ch.command({ query }); };
  await apply();
  const seed = (await timedQuery('SELECT agent_id, account FROM payees FINAL ORDER BY agent_id, account')).rows;
  await apply();
  assert.deepEqual((await timedQuery('SELECT agent_id, account FROM payees FINAL ORDER BY agent_id, account')).rows, seed);
  const after = new Set((await timedQuery<{ event_id: string }>('SELECT event_id FROM agent_events')).rows.map(e => e.event_id));
  assert(before.every(e => after.has(e.event_id)), 'Existing events were lost');
  const allowed = (await timedQuery<{ account: string }>("SELECT account FROM payees FINAL WHERE agent_id = 'invoice-bot' ORDER BY account")).rows.map(r => r.account);
  for (const account of ['ACME-001', 'GLOBEX-002', 'INITECH-003']) assert(allowed.includes(account));
  const initial = await metrics();
  if (initial.total_events === 0) assert.equal(initial.guard_p95_ms, null);

  const runs: string[] = [];
  for (let n = 0; n < 2; n++) {
    const run_id = `setup-smoke-ws-c-ledger-${randomUUID()}`;
    runs.push(run_id);
    const context = { run_id, agent_id: 'invoice-bot', version: 'v1', session_id: `ledger-check-${n}`,
      attack_id: 'gateway-unknown-destination-check', source: 'external' as const, guard: true };
    const args = { account: 'ACME-001', amount: 12.50, invoice_id: `CHECK-${n}` };
    const on = createToolGateway(context);
    const known = JSON.parse(await on.payInvoice(args));
    assert.equal(known.ok, true);
    await assert.rejects(on.payInvoice({ ...args, account: 'UNKNOWN-CHECK' }), ToolBlockedError);
    const off = createToolGateway({ ...context, guard: false });
    assert.equal(JSON.parse(await off.payInvoice({ ...args, account: 'UNKNOWN-CHECK' })).ok, true);
    await assert.rejects(createToolGateway({ ...context, agent_id: 'isolated-check-agent' }).payInvoice(args), ToolBlockedError);
    await assert.rejects(on.payInvoice({ ...args, amount: -1 }));
    const rows = (await timedQuery<{ event_id: string; event_type: string; is_new_payee: number; guard_ms: number | null }>(
      'SELECT event_id, event_type, is_new_payee, guard_ms FROM agent_events WHERE run_id = {run:String}', { run: run_id })).rows;
    assert.equal(rows.length, 4);
    assert.equal(new Set(rows.map(r => r.event_id)).size, 4);
    assert.equal(rows.filter(r => r.event_type === 'tool_blocked').length, 2);
    assert.equal(rows.filter(r => r.guard_ms === null).length, 1);
    // Duplicate physical audit rows cannot inflate logical dashboard totals.
    const event = (await timedQuery<any>('SELECT * EXCEPT (event_time, agent_version, tool_name, source_id, decision, outcome, details, ts) FROM agent_events WHERE event_id = {id:UUID}', { id: known.event_id })).rows[0];
    const count = await logicalEventCount(run_id);
    await insertEvents([event]);
    assert.equal(await logicalEventCount(run_id), count);
    const ledger = JSON.parse(await on.readLedger({ account: 'ACME-001' }));
    assert.equal(ledger.entries.length, 1);
  }
  assert.notEqual(runs[0], runs[1]);
  const final = await metrics();
  assert.equal(final.total_events, initial.total_events, 'Verification must not inflate production counts');
  assert.equal(final.blocked_24h, initial.blocked_24h, 'Verification must not inflate production blocks');
  const hunt = await fleetHunt('invoice-bot');
  assert(hunt.rowsRead >= 0 && hunt.elapsedMs >= 0);
  console.log(JSON.stringify({ migration_passes: 2, existing_events_preserved: before.length,
    invoice_payees: allowed, ledger_verification_runs: runs, hunt_rows: hunt.rows.length,
    hunt_rows_examined: hunt.rowsRead, hunt_elapsed_ms: hunt.elapsedMs }));
} finally { await ch.close(); }
