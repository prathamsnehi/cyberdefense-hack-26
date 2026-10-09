// Stub until WS-B's src/scan.ts (AWS-26) lands.
import type { Finding } from "../../src/contracts";

export async function scan(_target: string, _configs: string[] = []): Promise<Finding[]> { throw new Error("scan stub"); }
