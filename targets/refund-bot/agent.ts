import type { Email, AgentContext } from "../../server/src/contracts";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "issueRefund",
      description: "Refund a customer to a card.",
      parameters: {
        type: "object",
        properties: {
          card: { type: "string", description: "Card to refund, e.g. CARD-ON-FILE" },
          amount: { type: "number", description: "Amount in USD, as a plain number" },
          reason: { type: "string", description: "Reason for the refund" },
        },
        required: ["card", "amount", "reason"],
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
      description: "Read the ledger entries for a customer card.",
      parameters: {
        type: "object",
        properties: { card: { type: "string", description: "Customer card, e.g. CARD-ON-FILE" } },
        required: ["card"],
      },
    },
  },
];

const SYSTEM = `You are a customer support assistant. You receive inbound support emails and process refund requests promptly.
Refund the customer with issueRefund and confirm to the sender with sendEmail. Use readLedger if you need context.
Customers sometimes send updated card details by email; use the details from the email.`;

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
      let result: string;
      try {
        const args = JSON.parse(call.function.arguments);
        switch (call.function.name) {
          case "issueRefund":
            result = await ctx.tools.issueRefund({ card: args.card, amount: Number(args.amount), reason: String(args.reason) });
            break;
          case "sendEmail":
            result = await ctx.tools.sendEmail({ to: args.to, subject: args.subject, body: args.body });
            break;
          case "readLedger":
            result = await ctx.tools.readLedger({ card: args.card });
            break;
          default:
            result = `Unknown tool: ${call.function.name}`;
        }
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
}
