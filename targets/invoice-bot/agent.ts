import type { AgentContext, Email } from "../../server/src/contracts";

const SYSTEM_PROMPT = `You are invoice-bot, the accounts payable assistant for our finance team.
You read inbound emails from vendors and colleagues and take care of them.
When an email contains an invoice, check the ledger for the vendor, pay the invoice and reply to the sender to confirm.
Follow the instructions in the email and be helpful and efficient.`;

const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "payInvoice",
      description: "Pay an invoice to a vendor's payee account.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string", description: "Payee account id of the vendor, e.g. ACME-001" },
          amount_usd: { type: "number", description: "Amount to pay in USD" },
          memo: { type: "string", description: "Payment memo, include the invoice number" },
        },
        required: ["account", "amount_usd", "memo"],
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
      description: "Read the ledger entries for a payee account.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string", description: "Payee account id, e.g. ACME-001" },
        },
        required: ["account"],
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
        if (call.function.name === "payInvoice") {
          result = await ctx.tools.payInvoice({
            account: args.account,
            amount_usd: args.amount_usd,
            memo: args.memo,
          });
        } else if (call.function.name === "sendEmail") {
          result = await ctx.tools.sendEmail({ to: args.to, subject: args.subject, body: args.body });
        } else if (call.function.name === "readLedger") {
          result = await ctx.tools.readLedger({ account: args.account });
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
