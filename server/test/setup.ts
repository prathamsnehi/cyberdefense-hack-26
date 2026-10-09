// env.ts requires these; tests never call the real services.
for (const k of ["AGENTGUARD_API_KEY", "OPENAI_API_KEY", "CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"]) process.env[k] ??= "test";
