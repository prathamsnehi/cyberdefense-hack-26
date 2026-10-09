import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT } from "./env";

// Local lessons store: markdown files under kb/, searched in-process with tf-idf. Deterministic, no vendor.
export type Lesson = { id: string; title: string; text: string };
type Index = { docs: Lesson[]; tf: Map<string, number>[]; df: Map<string, number> };

const FOLDERS = ["policies", "incidents", "learned"];
const MAX_CHARS = 4000;
const SNIPPET_CHARS = 600;

let index: Promise<Index> | null = null;

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-+|-+$/g, "") || "lesson";

async function readDoc(folder: string, file: string): Promise<Lesson> {
  const lines = (await readFile(resolve(ROOT, "kb", folder, file), "utf8")).trim().split(/\r?\n/);
  const name = file.slice(0, -3);
  const title = lines[0]?.startsWith("# ") ? lines.shift()!.slice(2).trim() : name;
  if (/^id:\s/.test(lines.at(-1) ?? "")) lines.pop();
  return { id: `${folder}/${name}`, title, text: lines.join("\n").trim() };
}

async function build(): Promise<Index> {
  const docs: Lesson[] = [];
  for (const folder of FOLDERS) {
    const files = await readdir(resolve(ROOT, "kb", folder)).catch(() => [] as string[]);
    for (const f of files.filter((f) => f.endsWith(".md")).sort()) docs.push(await readDoc(folder, f));
  }
  const df = new Map<string, number>();
  const tf = docs.map((d) => {
    const tokens = tokenize(`${d.title} ${d.text}`);
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const [t, n] of counts) { counts.set(t, n / tokens.length); df.set(t, (df.get(t) ?? 0) + 1); }
    return counts;
  });
  return { docs, tf, df };
}

export const listLocal = async (): Promise<Lesson[]> => (await (index ??= build())).docs;

export async function searchLocal(query: string, max = 5): Promise<string> {
  const { docs, tf, df } = await (index ??= build());
  const terms = [...new Set(tokenize(query))];
  const hits = docs
    .map((d, i) => ({ d, score: terms.reduce((s, t) => s + (tf[i].get(t) ?? 0) * Math.log(1 + docs.length / (df.get(t) ?? 1)), 0) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id))
    .slice(0, max);
  if (!hits.length) return "(no lessons)";
  return hits.map(({ d }) => `[${d.id}] ${d.title}\n${d.text.slice(0, SNIPPET_CHARS)}`).join("\n\n").slice(0, MAX_CHARS);
}

export async function addLocal(title: string, text: string): Promise<void> {
  const name = slug(title);
  const dir = resolve(ROOT, "kb", "learned");
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, `${name}.md`), `# ${title.replace(/\s+/g, " ").trim()}\n\n${text.trim()}\n\nid: learned/${name}\n`);
  index = null;
}
