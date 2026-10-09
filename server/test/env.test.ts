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
  vi.stubEnv("OPENAI_BASE_URL", undefined);
  vi.stubEnv("OPENAI_MODEL", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Neon environment configuration", () => {
  it("starts without an OpenAI key and normalizes the branch gateway URL", async () => {
    const { env } = await import("../src/env");
    expect(env.OPENAI_BASE_URL).toBe("https://br-test-api.ai.us-east-2.aws.neon.tech/v1");
    expect(env.OPENAI_API_KEY).toBe("neon-test-token");
  });
  it("prefers OPENAI_BASE_URL, OPENAI_API_KEY and OPENAI_MODEL over the legacy Neon names", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "https://gw.example/v1/");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("OPENAI_MODEL", "gpt-5-4-mini");
    const { env, requireLlm } = await import("../src/env");
    expect(requireLlm()).toEqual({ apiKey: "openai-test", baseURL: "https://gw.example/v1" });
    expect(env.OPENAI_MODEL).toBe("gpt-5-4-mini");
  });
  it("defaults to api.openai.com when no base URL is configured", async () => {
    vi.stubEnv("NEON_AI_GATEWAY_BASE_URL", undefined);
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    expect((await import("../src/env")).env.OPENAI_BASE_URL).toBe("https://api.openai.com/v1");
  });
  it.each(["AGENTGUARD_API_KEY", "CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"])("requires %s", async (key) => {
    vi.stubEnv(key, undefined);
    await expect(import("../src/env")).rejects.toThrow(`Missing env var ${key}`);
  });
  it("boots without a model key but requires OPENAI_API_KEY (or NEON_AI_GATEWAY_TOKEN) before model access", async () => {
    vi.stubEnv("NEON_AI_GATEWAY_TOKEN", undefined);
    const { requireLlm } = await import("../src/env");
    expect(requireLlm).toThrow("Missing env var OPENAI_API_KEY");
    const { neon } = await import("../src/llm");
    expect(() => neon.chat).toThrow("Missing env var OPENAI_API_KEY");
  });
  it.each(["http://gateway.example", "https://gateway.example/v1", "https://user:password@gateway.example", "https://gateway.example/?token=secret"])("rejects malformed gateway configuration", async (url) => {
    vi.stubEnv("NEON_AI_GATEWAY_BASE_URL", url);
    await expect(import("../src/env")).rejects.toThrow("must be a bare HTTPS host");
  });
  it("accepts TARGET_PROVIDER=openai as an alias of neon and rejects unknown values", async () => {
    vi.stubEnv("TARGET_PROVIDER", "openai");
    expect((await import("../src/env")).env.TARGET_PROVIDER).toBe("neon");
    vi.resetModules();
    vi.stubEnv("TARGET_PROVIDER", "bogus");
    await expect(import("../src/env")).rejects.toThrow("TARGET_PROVIDER must be neon, openai or akash");
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
