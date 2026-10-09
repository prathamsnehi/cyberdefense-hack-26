// Fallback / bridge: POST an email file (first line "Subject: ...") to the running agent.
// Usage: tsx inject.ts emails/legit.txt [from-address]
import { readFileSync } from "node:fs";
const [file, from = "luigirscanoro@gmail.com"] = process.argv.slice(2);
const raw = readFileSync(file, "utf8"); const [first, ...rest] = raw.split("\n");
const subject = first.replace(/^Subject:\s*/i, ""); const body = rest.join("\n").trim();
const r = await fetch(`http://localhost:${process.env.DEMO_PORT || 18791}/email`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from, subject, body }) });
console.log(r.status, await r.text());
