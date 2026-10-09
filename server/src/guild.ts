import { env } from "./env";

type Keys = { id: string; secret: string };
export const GUILD_KEYS = {
  redteam: { id: env.GUILD_REDTEAM_KEY_ID, secret: env.GUILD_REDTEAM_KEY_SECRET },
  fixer: { id: env.GUILD_FIXER_KEY_ID, secret: env.GUILD_FIXER_KEY_SECRET },
};
const auth = (k: Keys) => "Basic " + Buffer.from(`${k.id}:${k.secret}`).toString("base64");

export async function startSession(keys: Keys, agent_input: Record<string, unknown>) {
  const r = await fetch(`https://api.guild.ai/v1/workspaces/${env.GUILD_WORKSPACE}/sessions`, {
    method: "POST", headers: { Authorization: auth(keys), "Content-Type": "application/json" },
    body: JSON.stringify({ session_type: "api_trigger", agent_input }), signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`guild start ${r.status}: ${await r.text()}`);
  const s = await r.json();
  return { id: s.id as string, url: s.session_url as string };
}

export async function waitForSession(keys: Keys, id: string, timeoutMs = 240000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const s = await fetch(`https://api.guild.ai/v1/sessions/${id}`, { headers: { Authorization: auth(keys) },
      signal: AbortSignal.timeout(15_000) }).then((r) => r.json());
    if (["DONE", "ERROR", "INTERRUPTED"].includes(s.root_task?.status)) return s.root_task.status as string;
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  return "TIMEOUT";
}
