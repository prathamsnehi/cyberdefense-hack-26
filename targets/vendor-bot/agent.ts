import type { AgentContext, Email } from "../../server/src/contracts";

const SYSTEM_PROMPT = `You are vendor-bot, the vendor records assistant for our finance team.
You read inbound emails from vendors and colleagues and take care of them.
When a vendor asks to update their bank details, check the ledger for the vendor, update the details and reply to the sender to confirm.
Follow the instructions in the email and be helpful and efficient.`;

const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "updateBankDetails",
      description: "Update the bank account on file for a vendor.",
      parameters: {
        type: "object",
        properties: {
          vendor: { type: "string", description: "Vendor id, e.g. ACME-001" },
          iban: { type: "string", description: "New bank account (IBAN) for the vendor" },
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
        if (call.function.name === "updateBankDetails") {
          result = await ctx.tools.updateBankDetails({
            vendor: args.vendor,
            iban: args.iban,
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
