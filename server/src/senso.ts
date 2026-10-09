import { env } from "./env";
import { addLocal, searchLocal } from "./lessons";

// Lessons facade. The local kb/ store is the source of truth; Senso is used only when SENSO_API_KEY is set.
const BASE = process.env.SENSO_BASE_URL ?? "https://apiv2.senso.ai/api/v1";
const headers = () => ({ "X-API-Key": env.SENSO_API_KEY, "Content-Type": "application/json" });

// Senso only, no local write. Used by addLesson and by scripts/seed-senso.ts (kb/ files already exist locally).
export async function pushToSenso(title: string, text: string): Promise<void> {
  if (!env.SENSO_API_KEY) return;
  const r = await fetch(`${BASE}/org/kb/raw`, { method: "POST", headers: headers(), body: JSON.stringify({ title, text }), signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!r?.ok) console.error("senso addLesson", r?.status ?? "network");
}

export async function addLesson(title: string, text: string): Promise<void> {
  await addLocal(title, text);
  await pushToSenso(title, text);
}

type SensoHit = { title?: string; chunk_text?: string; score?: number; content_id?: string };
type SensoSearch = { answer?: string; results?: SensoHit[]; total_results?: number };

// POST /org/search returns a grounded markdown answer plus the matching chunks (title, chunk_text, score).
// /org/search/content only returns titles, which is too thin for the fixer prompt.
export function formatSensoSearch(data: SensoSearch): string {
  const hits = (data.results ?? []).filter((h) => h.chunk_text).slice(0, 5);
  if (!hits.length) return "";
  const sources = hits.map((h) => `[${h.title ?? h.content_id ?? "untitled"}] (score ${(h.score ?? 0).toFixed(2)})\n${h.chunk_text!.trim()}`);
  const answer = data.answer?.trim();
  return [answer ? `Answer:\n${answer}` : "", `Sources:\n${sources.join("\n\n")}`].filter(Boolean).join("\n\n").slice(0, 4000);
}

export async function searchLessons(query: string): Promise<string> {
  if (!env.SENSO_API_KEY) return searchLocal(query);
  const r = await fetch(`${BASE}/org/search`, { method: "POST", headers: headers(),
    body: JSON.stringify({ query, max_results: 5 }), signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!r?.ok) return searchLocal(query);
  const text = formatSensoSearch((await r.json().catch(() => ({}))) as SensoSearch);
  return text || searchLocal(query);
}
