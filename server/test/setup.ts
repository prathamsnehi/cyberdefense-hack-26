// Offline tests use dummy credentials and never call real services.
for (const k of ["AGENTGUARD_API_KEY", "NEON_AI_GATEWAY_TOKEN", "CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"]) process.env[k] ??= "test";
process.env.NEON_AI_GATEWAY_BASE_URL ??= "https://br-test-api.ai.us-east-2.aws.neon.tech";
process.env.TARGET_PROVIDER = "neon";
