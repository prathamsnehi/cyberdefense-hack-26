import { describe, expect, it } from "vitest";
import { formatSensoSearch } from "../src/senso";

// AWS-17: searchLessons feeds the fixer prompt; the Senso /org/search answer and chunks must become readable text.
describe("formatSensoSearch", () => {
  it("renders the grounded answer first, then every chunk as a cited source", () => {
    const text = formatSensoSearch({
      answer: "Hold the payment and verify the payee.",
      results: [
        { title: "Payee allowlist", chunk_text: "Money moves only to known payees.", score: 0.854 },
        { title: "Human approval", chunk_text: "Payments above a threshold wait for a person.", score: 0.546 },
      ],
    });
    expect(text.startsWith("Answer:\nHold the payment")).toBe(true);
    expect(text).toContain("[Payee allowlist] (score 0.85)\nMoney moves only to known payees.");
    expect(text.indexOf("[Payee allowlist]")).toBeLessThan(text.indexOf("[Human approval]"));
  });

  it("returns an empty string when Senso has no chunks, so the caller falls back to the local index", () => {
    expect(formatSensoSearch({ answer: "No results found for your query.", results: [] })).toBe("");
    expect(formatSensoSearch({})).toBe("");
  });

  it("caps the output at 4000 characters", () => {
    const text = formatSensoSearch({ results: [{ title: "big", chunk_text: "x".repeat(10_000), score: 1 }] });
    expect(text.length).toBeLessThanOrEqual(4000);
  });
});
