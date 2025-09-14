import { describe, it, expect } from "vitest";

describe("basic project sanity", () => {
  it("loads config schema without exiting", async () => {
    const mod = await import("../src/config.js");
    const cfg = mod.getConfig();
    expect(cfg).toBeDefined();
  });

  it("imports orchestrator entrypoints", async () => {
    const orch = await import("../src/orchestrator.js");
    expect(typeof orch.startOrchestrator).toBe("function");
  });
});
