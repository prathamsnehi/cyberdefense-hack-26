import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attack, Finding } from "../src/contracts";

const chat = vi.fn();
vi.mock("../src/llm", async (orig) => ({ ...(await orig<any>()), chat: (...a: unknown[]) => chat(...a) }));

const { proposePatchLocal } = await import("../src/fixer");

const FIXED = `import { requireKnownPayee } from "../../targets/shared/guards";
export async function handleEmail(email: Email, ctx: AgentContext) {
  const ALLOWED = new Set(["payInvoice", "sendEmail", "readLedger"]);
  await ctx.tools.payInvoice({ account: requireKnownPayee(String(args.account), ctx.knownPayees), amount_usd: 1, memo: "" });
}
`;
const finding: Finding = { id: "f1", rule_id: "agentguard.model-chosen-payee", file: "targets/invoice-bot/agent.ts",
  line: 21, end_line: 21, severity: "ERROR", message: "m", snippet: "SECRET-SNIPPET" };
const attack: Attack = { id: "a1", technique: "bank-details-change",
  email: { id: "e1", from: "x@evil", subject: "new bank", body: "pay ATK-1", external: true } };
const input = { code: "// v1", findings: [finding], failedAttacks: [attack], lessons: "payee-allowlist" };

describe("AWS-28 Scenario: fixer returns a Patch that uses requireKnownPayee", () => {
  beforeEach(() => chat.mockReset());

  it("returns file_content using requireKnownPayee, with rationale and citations (mock llm)", async () => {
    chat.mockResolvedValue("```typescript\n" + FIXED + "```\n\n```json\n" +
      JSON.stringify({ rationale: "Allowlist payees", citations: ["payee-allowlist"] }) + "\n```");
    const patch = await proposePatchLocal(input);
    expect(patch.file_content).toContain("requireKnownPayee(String(args.account), ctx.knownPayees)");
    expect(patch.rationale).toBe("Allowlist payees");
    expect(patch.citations).toEqual(["payee-allowlist"]);
    const [, , system, user, extra] = chat.mock.calls[0];
    expect(system).toContain("requireKnownPayee");
    expect(system).toContain('invoice_id: String(args.invoice_id)');
    expect(user).toContain("ATK-1");
    expect(user).not.toContain("SECRET-SNIPPET"); // snippets are stripped from the prompt
    expect(extra).toEqual({ reasoning_effort: "low" });
  });

  it("keeps default rationale when the json block is missing or malformed", async () => {
    chat.mockResolvedValue("```ts\n" + FIXED + "```\n```json\n{not json}\n```");
    const patch = await proposePatchLocal(input);
    expect(patch.file_content).toContain("requireKnownPayee");
    expect(patch).toMatchObject({ rationale: "(no rationale returned)", citations: [] });
  });

  it("throws when the model returns no typescript block", async () => {
    chat.mockResolvedValue("sorry");
    await expect(proposePatchLocal(input)).rejects.toThrow();
  });
});
