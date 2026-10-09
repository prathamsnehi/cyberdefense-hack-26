import { env } from "../src/env";
import { listLocal } from "../src/lessons";
import { pushToSenso } from "../src/senso";

// Prints the local lessons index; pushes every kb/ doc to Senso only when SENSO_API_KEY is set.
const docs = await listLocal();
for (const folder of ["policies", "incidents", "learned"]) {
  console.log(`  kb/${folder}: ${docs.filter((d) => d.id.startsWith(`${folder}/`)).length}`);
}
if (!env.SENSO_API_KEY) {
  console.log(`local lessons index: ${docs.length} docs, Senso skipped`);
} else {
  console.log(`local lessons index: ${docs.length} docs, pushing to Senso`);
  for (const d of docs) {
    await pushToSenso(d.title, `${d.text}\n\nid: ${d.id}`);
    console.log("seeded", d.id);
  }
}
