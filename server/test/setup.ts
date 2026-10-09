// env.ts requires these; tests never call the real services.
for (const k of ["AGENTGUARD_API_KEY", "CLICKHOUSE_PASSWORD"]) process.env[k] ??= "test";
process.env.CLICKHOUSE_URL ??= 'https://example.invalid';
