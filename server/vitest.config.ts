import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Modules owned by other workstreams may not be on main yet. When a real file is missing, tests resolve it to a
// stub in test/stubs/ so WS-B logic stays testable. Once the real module lands, the real file wins automatically.
const optional = ["llm", "redteam", "sandbox/manager", "clickhouse", "queries", "senso", "scan"];
const alias = optional
  .filter((m) => !existsSync(resolve(__dirname, `src/${m}.ts`)))
  .map((m) => ({ find: new RegExp(`^\\.{1,2}/(src/)?${m.replace("/", "\\/")}$`), replacement: resolve(__dirname, `test/stubs/${m.replace("/", "-")}.ts`) }));

export default defineConfig({ test: { setupFiles: ["test/setup.ts"] }, resolve: { alias } });
