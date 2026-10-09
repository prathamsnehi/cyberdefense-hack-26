import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("dotenv", () => ({ config: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEON_AI_GATEWAY_TOKEN", "neon-test-token");
  vi.stubEnv("NEON_AI_GATEWAY_BASE_URL", "https://br-test-api.ai.us-east-2.aws.neon.tech/");
  vi.stubEnv("AGENTGUARD_API_KEY", "guard-test");
  vi.stubEnv("CLICKHOUSE_URL", "https://test.clickhouse.cloud:8443");
  vi.stubEnv("CLICKHOUSE_PASSWORD", "clickhouse-test");
  vi.stubEnv("TARGET_PROVIDER", "neon");
  vi.stubEnv("OPENAI_API_KEY", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Neon environment configuration", () => {
  it("starts without an OpenAI key and normalizes the branch gateway URL", async () => {
    const { env } = await import("../src/env");
    expect(env.NEON_AI_GATEWAY_BASE_URL).toBe("https://br-test-api.ai.us-east-2.aws.neon.tech");
    expect(env.NEON_AI_GATEWAY_TOKEN).toBe("neon-test-token");
  });
  it.each(["NEON_AI_GATEWAY_TOKEN", "NEON_AI_GATEWAY_BASE_URL", "AGENTGUARD_API_KEY", "CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"])("requires %s", async (key) => {
    vi.stubEnv(key, undefined);
    await expect(import("../src/env")).rejects.toThrow(`Missing env var ${key}`);
  });
  it.each(["http://gateway.example", "https://gateway.example/v1", "https://user:password@gateway.example", "https://gateway.example/?token=secret"])("rejects malformed gateway configuration", async (url) => {
    vi.stubEnv("NEON_AI_GATEWAY_BASE_URL", url);
    await expect(import("../src/env")).rejects.toThrow("must be a bare HTTPS host");
  });
  it("does not allow the old OpenAI provider selection", async () => {
    vi.stubEnv("TARGET_PROVIDER", "openai");
    await expect(import("../src/env")).rejects.toThrow("TARGET_PROVIDER must be neon or akash");
  });
  it("requires an Akash key only when selected, accepting the supplied alias", async () => {
    vi.stubEnv("TARGET_PROVIDER", "akash");
    vi.stubEnv("AKASHML_API_KEY", undefined);
    vi.stubEnv("AKASH_API_KEY", undefined);
    await expect(import("../src/env")).rejects.toThrow("Missing env var AKASHML_API_KEY");
    vi.resetModules();
    vi.stubEnv("AKASH_API_KEY", "akash-test");
    expect((await import("../src/env")).env.AKASHML_API_KEY).toBe("akash-test");
  });
});
