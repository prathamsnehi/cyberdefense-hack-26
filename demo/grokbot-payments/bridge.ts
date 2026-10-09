// Inbox bridge: the Grok Bot inbox is read with Grok Bot's email tools (no IMAP/webhook).
// Grok Bot reads each new email and pipes it here as JSON: {"from","subject","body"} (one object or an array).
// Usage: echo '{"from":"...","subject":"...","body":"..."}' | tsx bridge.ts
let raw = ""; for await (const c of process.stdin) raw += c;
const items = [].concat(JSON.parse(raw));
for (const e of items) {
  const r = await fetch(`http://localhost:${process.env.DEMO_PORT || 18791}/email`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(e) });
  console.log(r.status, await r.text());
}
