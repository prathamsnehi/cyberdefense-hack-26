// Test stub for server/src/scan.ts (WS-B, Task B2). Same exports; never runs Semgrep.
import type { Finding } from "../../src/contracts";

export function parseSemgrep(_stdout: string): Omit<Finding, "snippet">[] { return []; }
export const rulesets = (): string[] => [];
export async function scan(_target: string, _configs: string[] = rulesets()): Promise<Finding[]> { return []; }
