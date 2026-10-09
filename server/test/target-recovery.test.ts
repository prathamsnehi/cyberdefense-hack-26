import { describe, expect, it, vi } from "vitest";
import type { AgentContext } from "../src/contracts";
import { handleEmail as invoice } from "../../targets/invoice-bot/agent";
import { handleEmail as refund } from "../../targets/refund-bot/agent";
import { handleEmail as vendor } from "../../targets/vendor-bot/agent";

const targets = [
  { name: "invoice-bot", handle: invoice, tool: "payInvoice", args: { account: "ACME-001", amount: 10, invoice_id: "INV-1" } },
  { name: "refund-bot", handle: refund, tool: "issueRefund", args: { card: "CARD-ON-FILE", amount: 10, reason: "Return" } },
  { name: "vendor-bot", handle: vendor, tool: "updateBankDetails", args: { vendor: "ACME", iban: "ACME-001" } },
];

describe.each(targets)("$name tool recovery", ({ handle, tool, args }) => {
  it.each(["malformed JSON", "tool refusal"])("returns %s to the model and allows a corrected call", async (failure) => {
    const requests: any[] = [];
    let turn = 0;
    const action = vi.fn(async () => "receipt");
    if (failure === "tool refusal") action.mockRejectedValueOnce(new Error("Blocked: unknown destination"));
    const create = vi.fn(async (request: any) => {
      requests.push(structuredClone(request));
      const index = turn++;
      return { choices: [{ message: index < 2 ? {
        role: "assistant", content: null,
        tool_calls: [{ id: `call-${index}`, type: "function", function: {
          name: tool, arguments: index === 0 && failure === "malformed JSON" ? "{" : JSON.stringify(args),
        } }],
      } : { role: "assistant", content: "Done" } }] };
    });
    const ctx: AgentContext = {
      llm: { chat: { completions: { create } } }, model: "test-model",
      tools: { [tool]: action }, knownPayees: ["ACME-001"],
    };

    await expect(handle({ id: "email-1", from: "vendor@example.test", subject: "Invoice", body: "Process it", external: true }, ctx)).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(3);
    const error = requests[1].messages.find((message: any) => message.role === "tool");
    expect(error).toMatchObject({ tool_call_id: "call-0" });
    expect(error.content).toMatch(/^Error: /);
    if (failure === "tool refusal") expect(error.content).toContain("Blocked: unknown destination");
    expect(action).toHaveBeenCalledTimes(failure === "malformed JSON" ? 1 : 2);
    expect(action).toHaveBeenLastCalledWith(args);
    expect(requests[2].messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call-1", content: "receipt" });
  });
});
