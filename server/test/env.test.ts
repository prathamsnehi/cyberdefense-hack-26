import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("Neon environment", () => {
  it("loads database modules without a model key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("NEON_AI_GATEWAY_TOKEN", "");
    const { env, requireNeonGateway } = await import("../src/env");
    expect(env.CLICKHOUSE_DATABASE).toBe("albert");
    expect(() => requireNeonGateway()).toThrow("NEON_AI_GATEWAY_TOKEN");
  });
  it("uses the Neon credential and branch endpoint", async () => {
    vi.stubEnv("NEON_AI_GATEWAY_TOKEN", "neon-test");
    vi.stubEnv("NEON_AI_GATEWAY_BASE_URL", "https://branch.neon.tech/");
    const { env, requireNeonGateway } = await import("../src/env");
    expect(requireNeonGateway()).toEqual({ apiKey: "neon-test", baseURL: "https://branch.neon.tech/v1" });
    expect(env.OPENAI_API_KEY).toBe("neon-test");
  });
});
