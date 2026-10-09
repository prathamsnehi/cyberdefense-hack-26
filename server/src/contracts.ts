export type Email = { id: string; from: string; subject: string; body: string; external: boolean };

export type ToolFn = (args: Record<string, unknown>) => Promise<string>;

// Minimal shape of an OpenAI-compatible client, so contracts stay dependency-free.
export type LlmClient = {
  chat: { completions: { create: (body: any) => Promise<any> } };
};

export type AgentContext = {
  llm: LlmClient;
  model: string;
  tools: Record<string, ToolFn>; // payInvoice, sendEmail, readLedger (+ issueRefund / updateBankDetails in other bots)
  knownPayees: string[];
};

// Every target agent file must export exactly this:
export type HandleEmail = (email: Email, ctx: AgentContext) => Promise<void>;

export type EventType = "email_received" | "llm_call" | "tool_call" | "tool_blocked";

export type AgentEvent = {
  event_id?: string;
  run_id?: string;
  guard_ms?: number | null;
  agent_id: string;          // "invoice-bot"
  version: string;           // "v1", "v2", ...
  session_id: string;        // one email = one session
  event_type: EventType;
  tool: string;              // "" when not a tool event
  args: string;              // JSON string
  source: "external" | "internal" | "";
  is_new_payee: 0 | 1;
  attack_id: string;         // "" for legit traffic
  fleet: 0 | 1;              // 1 = synthetic load-generator traffic
};

export type Finding = {
  id: string; rule_id: string; file: string; line: number; end_line: number;
  severity: "ERROR" | "WARNING" | "INFO"; message: string; snippet: string;
};

export type Attack = { id: string; technique: string; email: Email };
export type AttackResult = { attack_id: string; technique: string; version: string; success: boolean };

export type GateInput = {
  version: string; semgrep_errors: number; happy_path_ok: boolean;
  attacks_total: number; attacks_succeeded: number; failed_attack_ids: string[];
  infra_errors: number;      // sandbox requests that failed for reasons other than a guard; any > 0 rejects
};
export type GateVerdict = GateInput & { accepted: boolean };

export type Patch = { file_content: string; rationale: string; citations: string[] };

export type LoopStep =
  | "scan" | "finding" | "attack_batch" | "patch" | "verdict"
  | "pr" | "rule" | "sweep" | "issue" | "lesson" | "guild" | "error" | "done";
export type LoopEvent = { run_id: string; step: LoopStep; ts: string; data: Record<string, unknown> };
