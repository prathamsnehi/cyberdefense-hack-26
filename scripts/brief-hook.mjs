// Claude Code UserPromptSubmit hook: injects an AgentGuard security brief for agent/money work. Node built-ins only.
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { prompt = "" } = JSON.parse(input.trim() || "{}");
if (!/\b(agent|tool|email|inbox|payment|pay|refund|invoice|webhook|bank)\b/i.test(prompt)) process.exit(0);
try {
  const r = await fetch(`${process.env.AGENTGUARD_URL ?? "http://localhost:8787"}/brief`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ task: prompt }), signal: AbortSignal.timeout(25000),
  });
  const { brief_md } = await r.json();
  process.stdout.write(`\n## AgentGuard security brief (read before writing any code)\n${brief_md}\n`);
} catch {
  // Never block the developer if AgentGuard is down.
}
