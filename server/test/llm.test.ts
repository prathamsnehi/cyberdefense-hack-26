import { describe, expect, it } from "vitest";
import { chat, neon, openai, target } from "../src/llm";
import { env } from "../src/env";

describe("OpenAI-compatible client routing", () => {
  it("sends chat completions and the bearer token to OPENAI_BASE_URL", async () => {
    let seen: Request | undefined;
    const client = neon.withOptions({ fetch: async (input, init) => {
      seen = new Request(input, init);
      return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "ok" } }] }), {
        headers: { "content-type": "application/json" },
      });
    } });
    expect(await chat(client, "test-model", "system", "user")).toBe("ok");
    expect(seen!.url).toBe(`${env.OPENAI_BASE_URL}/chat/completions`);
    expect(seen!.headers.get("authorization")).toBe(`Bearer ${env.OPENAI_API_KEY}`);
    expect(await seen!.json()).toMatchObject({ model: "test-model", messages: [{ role: "system", content: "system" }, { role: "user", content: "user" }] });
    expect(target).toBe(neon);
    expect(openai).toBe(neon); // Older workstream imports still go to Neon.
  });
});
