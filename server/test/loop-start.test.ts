import { describe, expect, it, vi } from 'vitest';
const loop = vi.hoisted(() => ({ runLoop: vi.fn() }));
vi.mock('../src/loop', () => loop);
import { app } from '../src/index';
import { env } from '../src/env';
import { bus } from '../src/bus';

const start = (agent: string, authorized = true) => app.request('/loop/start', {
  method: 'POST', headers: { 'content-type': 'application/json',
    authorization: authorized ? `Bearer ${env.AGENTGUARD_API_KEY}` : 'Bearer invalid' },
  body: JSON.stringify({ agent_id: agent }),
});

describe('run ownership', () => {
  it('rejects unauthorized starts without invoking the loop', async () => {
    expect((await start('invoice-bot', false)).status).toBe(401);
    expect(loop.runLoop).not.toHaveBeenCalled();
  });
  it('prevents concurrent runs from stopping each other, then permits a separate second run', async () => {
    let finish!: () => void;
    loop.runLoop.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const first = await start('invoice-bot');
    expect(first.status).toBe(200);
    const firstRun = await first.json();
    const status = await app.request('/loop/active', { headers: { authorization: `Bearer ${env.AGENTGUARD_API_KEY}` } });
    expect(await status.json()).toMatchObject({ agent_id: 'invoice-bot', run_id: firstRun.run_id });
    expect((await app.request('/loop/active')).status).toBe(401);
    const conflict = await start('invoice-bot');
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ run_id: firstRun.run_id });
    expect(loop.runLoop).toHaveBeenCalledTimes(1);
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await (await app.request('/loop/active', { headers: { authorization: `Bearer ${env.AGENTGUARD_API_KEY}` } })).json()).toMatchObject({ run_id: null });
    loop.runLoop.mockResolvedValueOnce(undefined);
    const second = await start('invoice-bot');
    expect(second.status).toBe(200);
    expect((await second.json()).run_id).not.toBe(firstRun.run_id);
  });
  it('records unexpected failure and releases the agent', async () => {
    loop.runLoop.mockRejectedValueOnce(new Error('runner failed'));
    const first = await start('refund-bot');
    const { run_id } = await first.json();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(bus.history(run_id).at(-1)?.step).toBe('error');
    loop.runLoop.mockResolvedValueOnce(undefined);
    expect((await start('refund-bot')).status).toBe(200);
  });
});
