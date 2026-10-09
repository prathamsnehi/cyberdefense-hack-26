import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { ROOT } from "../env";

const SERVER = resolve(ROOT, "server");
// The tsx binary directly (not through npx): one less process between us and the runner, so kill() reaches it.
const TSX = resolve(SERVER, "node_modules/.bin/tsx");

const procs = new Map<string, ChildProcess>();

export async function startVersion(agentId: string, version: string, file: string, guard: boolean) {
  const key = `${agentId}@${version}`;
  await stopVersion(agentId, version);
  const p = spawn(TSX, ["src/sandbox/runner.ts", "--agent", resolve(file), "--agent-id", agentId,
    "--version", version, "--port", "0", "--guard", guard ? "on" : "off"], { cwd: SERVER, stdio: ["ignore", "pipe", "pipe"] });
  procs.set(key, p);
  try {
    const port = await new Promise<number>((ok, fail) => {
      let stderr = "";
      const t = setTimeout(() => fail(new Error(`runner ${key} did not start`)), 30000);
      p.stdout!.on("data", (d) => { const m = String(d).match(/READY (\d+)/); if (m) { clearTimeout(t); ok(Number(m[1])); } });
      p.stderr!.on("data", (d) => { stderr = (stderr + d).slice(-1000); process.stderr.write(`[${key}] ${d}`); });
      // Fail fast if the runner dies before READY (bad import, missing env) instead of waiting 30 s.
      p.once("exit", (code) => { clearTimeout(t); fail(new Error(`runner ${key} exited early (code ${code}): ${stderr.trim()}`)); });
      p.once("error", (e) => { clearTimeout(t); fail(e); });
    });
    return `http://localhost:${port}`;
  } catch (e) {
    await stopVersion(agentId, version);
    throw e;
  }
}

export async function stopVersion(agentId: string, version: string) {
  const key = `${agentId}@${version}`;
  const p = procs.get(key);
  procs.delete(key);
  if (!p || p.exitCode !== null || p.signalCode !== null) return;
  // Wait for the exit so the next version never races a dying runner; SIGKILL if it ignores SIGTERM.
  await new Promise<void>((done) => {
    const force = setTimeout(() => p.kill("SIGKILL"), 3000);
    p.once("exit", () => { clearTimeout(force); done(); });
    p.kill();
  });
}

// Never leave runners behind when the API process goes away.
process.once("exit", () => { for (const p of procs.values()) p.kill("SIGKILL"); });
