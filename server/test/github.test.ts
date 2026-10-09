import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => { process.env.GITHUB_TOKEN = ""; process.env.GITHUB_REPO = ""; });

describe("github actions without a token", () => {
  it("Scenario: github.ts imports without crashing when GITHUB_REPO is empty", async () => {
    await expect(import("../src/github")).resolves.toBeDefined();
  });
  it("Scenario: PRs and issues are skipped with '(github disabled)'", async () => {
    const { openIssue, openPullRequest } = await import("../src/github");
    expect(await openPullRequest({ path: "targets/x/agent.ts", content: "x", title: "t", body: "b" })).toBe("(github disabled)");
    expect(await openIssue("t", "b")).toBe("(github disabled)");
  });
});
