import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ proposePatchLocal: vi.fn(async () => ({ file_content: "x", rationale: "r", citations: [] })),
  buildCorpusLocal: vi.fn(async () => []) }));
vi.mock("../src/fixer", () => ({ proposePatchLocal: m.proposePatchLocal }));
vi.mock("../src/redteam", () => ({ buildCorpusLocal: m.buildCorpusLocal }));
const { buildCorpus, getPatch } = await import("../src/runtime");

describe("runtime stub (local)", () => {
  it("Scenario: AGENT_RUNTIME=local builds the corpus and patches locally", async () => {
    await buildCorpus("run1", "invoice-bot", "http://localhost:1");
    expect(m.buildCorpusLocal).toHaveBeenCalledWith("run1");
    const input = { run_id: "run1", agent_id: "invoice-bot", version: "v2", code: "c", findings: [], failedAttacks: [], lessons: "" };
    expect(await getPatch(input)).toEqual({ file_content: "x", rationale: "r", citations: [] });
    expect(m.proposePatchLocal).toHaveBeenCalledWith(input);
  });
});
