// server/src/tools.ts (stub until D2a)
import { Hono } from "hono";
export const toolsRouter = new Hono();
export const runContext = new Map<string, any>();
export const pending = new Map<string, (value: any) => void>();
