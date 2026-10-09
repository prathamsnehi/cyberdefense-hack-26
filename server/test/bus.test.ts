import { describe, expect, it, vi } from "vitest";
import { bus } from "../src/bus";

describe("bus", () => {
  it("Scenario: events are logged per run and delivered to subscribers until unsubscribed", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const seen: string[] = [];
    const off = bus.on("r1", (e) => seen.push(e.step));
    bus.emit("r1", "scan", { total: 1 });
    bus.emit("r2", "scan");
    off();
    bus.emit("r1", "done");
    expect(seen).toEqual(["scan"]);
    expect(bus.history("r1").map((e) => e.step)).toEqual(["scan", "done"]);
    expect(bus.history("r1")[0]).toMatchObject({ run_id: "r1", step: "scan", data: { total: 1 } });
    expect(bus.history("nope")).toEqual([]);
  });
});
