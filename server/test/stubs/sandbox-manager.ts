// Stub until WS-A's src/sandbox/manager.ts lands.
export async function startVersion(_agentId: string, _version: string, _file: string, _guard: boolean): Promise<string> {
  throw new Error("sandbox manager stub");
}
export async function stopVersion(_agentId: string, _version: string): Promise<void> {}
