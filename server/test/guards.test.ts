import { describe, expect, it } from "vitest";
import { requireKnownPayee } from "../../targets/shared/guards";

// AWS-9 Scenario: requireKnownPayee blocks unknown payees
describe("requireKnownPayee", () => {
  it("throws for a payee that is not on the allowlist", () => {
    expect(() => requireKnownPayee("ATK-999", ["ACME-001"])).toThrow("Blocked: ATK-999 is not a known payee");
  });
  it("returns the account for a known payee", () => {
    expect(requireKnownPayee("ACME-001", ["ACME-001"])).toBe("ACME-001");
  });
});
