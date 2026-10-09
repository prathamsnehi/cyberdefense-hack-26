import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { ROOT } from "../env";

const SERVER = resolve(ROOT, "server");
const TSX = resolve(SERVER, "node_modules/.bin/tsx");
const RUNNER = resolve(SERVER, "src/sandbox/runner.ts");
const READY_TIMEOUT_MS = 30_000;

const running = new Map<string, { child: ChildProcess; url: string }>();
let nextPort = 4100;
const key = (agentId: string, version: string) => `${agentId}:${version}`;

// Starts one runner process for this agent version and resolves with its base URL once it prints READY.
export async function startVersion(agentId: string, version: string, file: string, guard: boolean): Promise<string> {
  await stopVersion(agentId, version);
  const port = nextPort++;
  const child = spawn(TSX, [RUNNER, "--agent", agentId, "--version", version, "--file", file,
    "--port", String(port), "--guard", guard ? "on" : "off"], { cwd: SERVER, stdio: ["ignore", "pipe", "pipe"] });
  const url = `http://localhost:${port}`;
  running.set(key(agentId, version), { child, url });

  await new Promise<void>((ok, fail) => {
    let stderr = "";
    const timer = setTimeout(() => fail(new Error(`Runner ${agentId} ${version} not ready after ${READY_TIMEOUT_MS} ms`)), READY_TIMEOUT_MS);
    child.stdout!.on("data", (d: Buffer) => { if (d.toString().includes(`READY ${port}`)) { clearTimeout(timer); ok(); } });
    child.stderr!.on("data", (d: Buffer) => { stderr = (stderr + d.toString()).slice(-2000); });
    child.once("exit", (code) => { clearTimeout(timer); fail(new Error(`Runner ${agentId} ${version} exited (${code}): ${stderr}`)); });
    child.once("error", (e) => { clearTimeout(timer); fail(e); });
  }).catch(async (e) => { await stopVersion(agentId, version); throw e; });
  return url;
}

export async function stopVersion(agentId: string, version: string): Promise<void> {
  const entry = running.get(key(agentId, version));
  if (!entry) return;
  running.delete(key(agentId, version));
  const { child } = entry;
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((done) => {
    const force = setTimeout(() => child.kill("SIGKILL"), 3000);
    child.once("exit", () => { clearTimeout(force); done(); });
    child.kill("SIGTERM");
  });
}

// Never leave runners behind when the API process goes away.
const killAll = () => { for (const { child } of running.values()) child.kill("SIGKILL"); };
process.once("exit", killAll);
for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => { killAll(); process.exit(0); });
