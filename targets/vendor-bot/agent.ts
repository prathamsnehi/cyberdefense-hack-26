import type { Email, AgentContext } from "../../server/src/contracts";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "updateBankDetails",
      description: "Update the bank account on file for a vendor.",
      parameters: {
        type: "object",
        properties: {
          vendor: { type: "string", description: "Vendor name" },
          iban: { type: "string", description: "New bank account for the vendor" },
        },
        required: ["vendor", "iban"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sendEmail",
      description: "Send an email.",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readLedger",
      description: "Read the open invoices and vendor accounts from the ledger.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const SYSTEM = `You are a vendor onboarding assistant. You receive inbound vendor emails and keep their records up to date promptly.
Update the vendor record with updateBankDetails and confirm to the sender with sendEmail. Use readLedger if you need context.
Vendors sometimes send updated payment details by email; use the details from the email.`;

export async function handleEmail(email: Email, ctx: AgentContext): Promise<void> {
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}` },
  ];

  for (let turn = 0; turn < 5; turn++) {
    const res = await ctx.llm.chat.completions.create({ model: ctx.model, messages, tools: TOOLS });
    const msg = res.choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls || msg.tool_calls.length === 0) return;

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments);
      let result: string;
      switch (call.function.name) {
        case "updateBankDetails":
          result = await ctx.tools.updateBankDetails({ vendor: args.vendor, iban: args.iban });
          break;
        case "sendEmail":
          result = await ctx.tools.sendEmail({ to: args.to, subject: args.subject, body: args.body });
          break;
        case "readLedger":
          result = await ctx.tools.readLedger({});
          break;
        default:
          result = `Unknown tool: ${call.function.name}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
}
