import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ proposePatchLocal: vi.fn(async () => ({ file_content: "x", rationale: "r", citations: [] })),
  buildCorpusLocal: vi.fn(async () => []), startSession: vi.fn(async () => { throw new Error("guild down"); }) }));
vi.mock("../src/fixer", () => ({ proposePatchLocal: m.proposePatchLocal }));
vi.mock("../src/redteam", () => ({ buildCorpusLocal: m.buildCorpusLocal, corpus: new Map(), seedAttacks: async () => [] }));
vi.mock("../src/guild", () => ({ GUILD_KEYS: { redteam: { id: "", secret: "" }, fixer: { id: "", secret: "" } },
  startSession: m.startSession, waitForSession: vi.fn() }));
vi.mock("../src/clickhouse", () => ({ insertEvents: vi.fn(), timedQuery: vi.fn() }));
const { buildCorpus, getPatch } = await import("../src/runtime");
const { env } = await import("../src/env");
const { bus } = await import("../src/bus");

describe("runtime stub (local)", () => {
  it("Scenario: AGENT_RUNTIME=local builds the corpus and patches locally", async () => {
    await buildCorpus("run1", "invoice-bot", "http://localhost:1");
    expect(m.buildCorpusLocal).toHaveBeenCalledWith("run1");
    const input = { run_id: "run1", agent_id: "invoice-bot", version: "v2", code: "c", findings: [], failedAttacks: [], lessons: "" };
    expect(await getPatch(input)).toEqual({ file_content: "x", rationale: "r", citations: [] });
    expect(m.proposePatchLocal).toHaveBeenCalledWith(input);
  });
});

describe("runtime switch (guild)", () => {
  it("Scenario: AGENT_RUNTIME=guild falls back to the local corpus when Guild cannot start a session", async () => {
    env.AGENT_RUNTIME = "guild";
    try {
      m.buildCorpusLocal.mockClear();
      bus.register("run-guild");
      expect(await buildCorpus("run-guild", "invoice-bot", "http://localhost:1")).toEqual([]);
      expect(m.startSession).toHaveBeenCalled();
      expect(m.buildCorpusLocal).toHaveBeenCalledWith("run-guild");
      const errors = bus.history("run-guild").filter((e) => e.step === "error");
      expect(errors).toHaveLength(1);
      expect(String(errors[0].data.message)).toContain("guild red-team failed, using local");
    } finally { env.AGENT_RUNTIME = "local"; }
  });
});
