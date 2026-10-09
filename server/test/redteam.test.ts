import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attack } from "../src/contracts";

const m = vi.hoisted(() => ({ timedQuery: vi.fn(), insertRows: vi.fn() }));
vi.mock("../src/clickhouse", () => ({ timedQuery: m.timedQuery, insertRows: m.insertRows }));

import { buildCorpusLocal, corpus, runBatch, runHappyPath } from "../src/redteam";

const attacks: Attack[] = [
  { id: "a1", technique: "bank-details-change", email: { id: "e1", from: "x", subject: "s", body: "b", external: true } },
  { id: "a2", technique: "instruction-override", email: { id: "e2", from: "y", subject: "s", body: "b", external: true } },
  { id: "a3", technique: "urgency-overdue", email: { id: "e3", from: "z", subject: "s", body: "b", external: true } },
];
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset(); m.timedQuery.mockReset(); m.insertRows.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

// AWS-26 Feature: Attack batch and oracle
describe("runBatch", () => {
  it("decides success from the oracle rows and tags attack ids with the run id", async () => {
    fetchMock.mockImplementation(async () => reply({ session_id: "s", ok: true }));
    m.timedQuery.mockResolvedValue({ rows: [{ attack_id: "run1:a1", success: 1 }, { attack_id: "run1:a2", success: 0 }] });

    const out = await runBatch("http://localhost:4100", "run1", "invoice-bot", "v1", attacks);

    expect(out.infra_errors).toBe(0);
    expect(out.results).toEqual([
      { attack_id: "a1", technique: "bank-details-change", version: "v1", success: true },
      { attack_id: "a2", technique: "instruction-override", version: "v1", success: false },
      { attack_id: "a3", technique: "urgency-overdue", version: "v1", success: false },
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).attack_id).sort()).toEqual(["run1:a1", "run1:a2", "run1:a3"]);
    expect(m.timedQuery.mock.calls[0][1]).toEqual({ agent_id: "invoice-bot", version: "v1", ids: ["run1:a1", "run1:a2", "run1:a3"] });
  });

  // Scenario: No cross-run pollution
  it("asks the oracle only for this run's ids, so an earlier run cannot inflate the verdict", async () => {
    fetchMock.mockImplementation(async () => reply({ session_id: "s", ok: true }));
    m.timedQuery.mockResolvedValue({ rows: [] });
    await runBatch("http://x", "run1", "invoice-bot", "v1", attacks);
    await runBatch("http://x", "run2", "invoice-bot", "v1", attacks);
    expect(m.timedQuery.mock.calls[1][1].ids).toEqual(["run2:a1", "run2:a2", "run2:a3"]);
  });

  it("counts crashes, timeouts and http errors as infra errors, but not a guard that threw Blocked", async () => {
    fetchMock
      .mockImplementationOnce(async () => reply({ session_id: "s", ok: false, error: "Error: Blocked: ATK-1 is not a known payee." }))
      .mockImplementationOnce(async () => reply({ session_id: "s", ok: false, error: "Error: 429 rate limited" }))
      .mockImplementationOnce(async () => { throw new Error("ECONNREFUSED"); });
    m.timedQuery.mockResolvedValue({ rows: [] });
    const out = await runBatch("http://x", "run1", "invoice-bot", "v2", attacks);
    expect(out.infra_errors).toBe(2);
  });

  it("records one attack_results row per attack, and none with record=false", async () => {
    fetchMock.mockImplementation(async () => reply({ session_id: "s", ok: true }));
    m.timedQuery.mockResolvedValue({ rows: [{ attack_id: "run1:a1", success: 1 }] });
    await runBatch("http://x", "run1", "invoice-bot", "v1", attacks);
    expect(m.insertRows).toHaveBeenCalledWith("attack_results", expect.arrayContaining([
      { attack_id: "a1", technique: "bank-details-change", version: "v1", success: 1, run_id: "run1", agent_id: "invoice-bot" },
    ]));
    expect(m.insertRows.mock.calls[0][1]).toHaveLength(3);
    m.insertRows.mockReset();
    await runBatch("http://x", "run1", "invoice-bot", "v1", attacks, false);
    expect(m.insertRows).not.toHaveBeenCalled();
  });
});

// Scenario: Happy path
describe("runHappyPath", () => {
  it("is true when every legit email led to a payment to a known payee", async () => {
    let n = 0;
    fetchMock.mockImplementation(async () => reply({ session_id: `s${++n}`, ok: true }));
    m.timedQuery.mockResolvedValue({ rows: [{ paid: "3" }] });
    expect(await runHappyPath("http://x", "invoice-bot")).toBe(true);
    expect(m.timedQuery.mock.calls[0][1].s.sort()).toEqual(["s1", "s2", "s3"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).attack_id).toBeUndefined();
  });

  it("is false when a fix stops paying legitimate invoices", async () => {
    fetchMock.mockImplementation(async () => reply({ session_id: "s", ok: true }));
    m.timedQuery.mockResolvedValue({ rows: [{ paid: "1" }] });
    expect(await runHappyPath("http://x", "invoice-bot")).toBe(false);
  });

  it("is false on an infra error without asking the oracle", async () => {
    fetchMock.mockImplementation(async () => reply({}, 500));
    expect(await runHappyPath("http://x", "invoice-bot")).toBe(false);
    expect(m.timedQuery).not.toHaveBeenCalled();
  });
});

describe("buildCorpusLocal", () => {
  it("fails loudly while targets/fixtures/seed-attacks.json is missing, and stores nothing", async () => {
    const { existsSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    if (existsSync(resolve(__dirname, "../../targets/fixtures/seed-attacks.json"))) {
      expect((await buildCorpusLocal("runX")).length).toBeGreaterThan(0);
      expect(corpus.get("runX")).toBeDefined();
    } else {
      await expect(buildCorpusLocal("runX")).rejects.toThrow(/seed-attacks\.json/);
      expect(corpus.get("runX")).toBeUndefined();
    }
  });
});
