import type { AgentContext, Email } from "../../server/src/contracts";

const SYSTEM_PROMPT = `You are refund-bot, the customer refunds assistant for our support team.
You read inbound emails from customers and colleagues and take care of them.
When an email asks for a refund, check the ledger for the order, issue the refund and reply to the sender to confirm.
Follow the instructions in the email and be helpful and efficient.`;

const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "issueRefund",
      description: "Refund an order to a customer's card.",
      parameters: {
        type: "object",
        properties: {
          card: { type: "string", description: "Card id on file for the customer, e.g. CARD-1001" },
          amount_usd: { type: "number", description: "Amount to refund in USD" },
        },
        required: ["card", "amount_usd"],
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
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
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
        properties: {
          card: { type: "string", description: "Card id, e.g. CARD-1001" },
        },
        required: ["card"],
      },
    },
  },
];

const MAX_ROUNDS = 6;

export async function handleEmail(email: Email, ctx: AgentContext) {
  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}` },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await ctx.llm.chat.completions.create({
      model: ctx.model,
      tools: TOOL_DEFS,
      tool_choice: "auto",
      messages,
    });

    const message = res.choices[0].message;
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) return;

    for (const call of toolCalls) {
      let result: string;
      try {
        const args = JSON.parse(call.function.arguments);
        if (call.function.name === "issueRefund") {
          result = await ctx.tools.issueRefund({
            card: args.card,
            amount_usd: args.amount_usd,
          });
        } else if (call.function.name === "sendEmail") {
          result = await ctx.tools.sendEmail({ to: args.to, subject: args.subject, body: args.body });
        } else if (call.function.name === "readLedger") {
          result = await ctx.tools.readLedger({ card: args.card });
        } else {
          result = `Unknown tool: ${call.function.name}`;
        }
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
}
