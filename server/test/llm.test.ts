import { describe, expect, it } from "vitest";
import { chat, neon, openai, target } from "../src/llm";
import { env } from "../src/env";

describe("Neon client routing", () => {
  it("sends chat completions and the Neon bearer token to the branch /v1 endpoint", async () => {
    let seen: Request | undefined;
    const client = neon.withOptions({ fetch: async (input, init) => {
      seen = new Request(input, init);
      return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "ok" } }] }), {
        headers: { "content-type": "application/json" },
      });
    } });
    expect(await chat(client, "test-model", "system", "user")).toBe("ok");
    expect(seen!.url).toBe(`${env.NEON_AI_GATEWAY_BASE_URL}/v1/chat/completions`);
    expect(seen!.headers.get("authorization")).toBe(`Bearer ${env.NEON_AI_GATEWAY_TOKEN}`);
    expect(await seen!.json()).toMatchObject({ model: "test-model", messages: [{ role: "system", content: "system" }, { role: "user", content: "user" }] });
    expect(target).toBe(neon);
    expect(openai).toBe(neon); // Older workstream imports still go to Neon.
  });
});
