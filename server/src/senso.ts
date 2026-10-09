import { env } from "./env";
import { addLocal, searchLocal } from "./lessons";

// Lessons facade. The local kb/ store is the source of truth; Senso is used only when SENSO_API_KEY is set.
const BASE = process.env.SENSO_BASE_URL ?? "https://apiv2.senso.ai/api/v1";
const headers = () => ({ "X-API-Key": env.SENSO_API_KEY, "Content-Type": "application/json" });

// Senso only, no local write. Used by addLesson and by scripts/seed-senso.ts (kb/ files already exist locally).
export async function pushToSenso(title: string, text: string): Promise<void> {
  if (!env.SENSO_API_KEY) return;
  const r = await fetch(`${BASE}/org/kb/raw`, { method: "POST", headers: headers(), body: JSON.stringify({ title, text }) }).catch(() => null);
  if (!r?.ok) console.error("senso addLesson", r?.status ?? "network");
}

export async function addLesson(title: string, text: string): Promise<void> {
  await addLocal(title, text);
  await pushToSenso(title, text);
}

export async function searchLessons(query: string): Promise<string> {
  if (!env.SENSO_API_KEY) return searchLocal(query);
  const r = await fetch(`${BASE}/org/search/content`, { method: "POST", headers: headers(),
    body: JSON.stringify({ query, max_results: 5 }), signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!r?.ok) return searchLocal(query);
  return JSON.stringify(await r.json()).slice(0, 4000);
}
