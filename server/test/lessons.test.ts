import { rmSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";

// Run against a temp copy of the committed kb/policies and kb/incidents, so lessons learned on a dev machine
// (kb/learned) cannot change the ranking and the test never writes into the repo.
const h = vi.hoisted(() => ({ root: "" }));
vi.mock("../src/env", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/env")>();
  const { cpSync, mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  h.root = mkdtempSync(join(tmpdir(), "agentguard-lessons-"));
  for (const d of ["policies", "incidents"]) cpSync(join(real.ROOT, "kb", d), join(h.root, "kb", d), { recursive: true });
  return { ...real, ROOT: h.root };
});

const { addLocal, searchLocal } = await import("../src/lessons");

afterAll(() => rmSync(h.root, { recursive: true, force: true }));

describe("local lessons", () => {
  it("ranks the payee allowlist policy first for a new-payee invoice email", async () => {
    const out = await searchLocal("new payee in invoice email");
    expect(out.startsWith("[policies/payee-allowlist] ")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(4000);
  });

  it("returns (no lessons) when nothing matches", async () => {
    expect(await searchLocal("zzzz-nothing")).toBe("(no lessons)");
  });

  it("finds a lesson added with addLocal on the next search", async () => {
    expect(await searchLocal("quokkafjord")).toBe("(no lessons)");
    await addLocal("Lesson vitest: temporary", "The quokkafjord marker appears only in this lesson.");
    const out = await searchLocal("quokkafjord");
    expect(out).toContain("[learned/lesson-vitest-temporary] Lesson vitest: temporary");
    expect(out).toContain("quokkafjord marker");
  });
});
