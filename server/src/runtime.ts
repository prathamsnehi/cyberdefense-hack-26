// server/src/runtime.ts: the local | guild switch, with automatic fallback to local.
import { bus } from "./bus";
import { env } from "./env";
import { proposePatchLocal } from "./fixer";
import { GUILD_KEYS, startSession, waitForSession } from "./guild";
import { buildCorpusLocal, corpus, seedAttacks } from "./redteam";
import { pending, runContext } from "./tools";
import type { Attack, Finding, Patch } from "./contracts";

export type PatchInput = { run_id: string; agent_id: string; version: string; code: string;
  findings: Finding[]; failedAttacks: Attack[]; lessons: string };

export async function buildCorpus(run_id: string, agent_id: string, url?: string): Promise<Attack[]> {
  if (env.AGENT_RUNTIME !== "guild") return buildCorpusLocal(run_id);
  try {
    corpus.set(run_id, await seedAttacks());
    runContext.set(run_id, { ...(runContext.get(run_id) ?? {}), agent_id, url, version: "v1" });
    const s = await startSession(GUILD_KEYS.redteam, { run_id, agent_id, version: "v1" });
    // Its own step: an "attack_batch" event without a version prints "undefined / undefined" on the scoreboard.
    bus.emit(run_id, "guild", { guild_session: s.url, status: "red-team exploring" });
    await waitForSession(GUILD_KEYS.redteam, s.id);
    return corpus.get(run_id)!;
  } catch (e) {
    bus.emit(run_id, "error", { message: `guild red-team failed, using local: ${e}` });
    return buildCorpusLocal(run_id);
  }
}

export async function getPatch(i: PatchInput): Promise<Patch> {
  if (env.AGENT_RUNTIME !== "guild") return proposePatchLocal(i);
  runContext.set(i.run_id, { ...(runContext.get(i.run_id) ?? {}), agent_id: i.agent_id, code: i.code,
    findings: i.findings, failedAttacks: i.failedAttacks.map((a) => a.email), lessons: i.lessons });
  const key = `${i.run_id}:patch:${i.version}`;
  const waiting = new Promise<Patch>((ok) => pending.set(key, ok));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const s = await startSession(GUILD_KEYS.fixer, { run_id: i.run_id, version: i.version });
    bus.emit(i.run_id, "guild", { guild_session: s.url, status: `fixer writing ${i.version}` });
    return await Promise.race([waiting, new Promise<Patch>((_, no) => { timer = setTimeout(() => no(new Error("timeout")), 180000); })]);
  } catch (e) {
    bus.emit(i.run_id, "error", { message: `guild fixer failed, using local: ${e}` });
    return proposePatchLocal(i);
  } finally {
    clearTimeout(timer);
    pending.delete(key);
  }
}
