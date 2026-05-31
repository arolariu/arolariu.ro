import {describe, expect, expectTypeOf, it} from "vitest";
import type {CheckProvider, ProviderRunInput, Schema} from "./provider.ts";
import type {ProviderOutcome} from "./types.ts";

describe("CheckProvider contract", () => {
  interface DummyPayload {
    readonly count: number;
  }

  const dummySchema: Schema<DummyPayload> = {
    parse(data: unknown): DummyPayload {
      if (typeof data !== "object" || data === null) throw new Error("not object");
      const rec = data as Record<string, unknown>;
      if (typeof rec["count"] !== "number") throw new Error("count not number");
      return {count: rec["count"]};
    },
  };

  const provider: CheckProvider<DummyPayload> = {
    id: "dummy",
    name: "Dummy",
    icon: "🦆",
    defaultGate: {kind: "blocking", blockOn: "error"},
    payloadSchema: dummySchema,
    applicableTo: () => true,
    async run(_input: ProviderRunInput): Promise<{payload: DummyPayload; findings: never[]}> {
      return {payload: {count: 42}, findings: []};
    },
  };

  it("provider has required identity fields", () => {
    expect(provider.id).toBe("dummy");
    expect(provider.name).toBe("Dummy");
    expect(provider.icon).toBe("🦆");
  });

  it("payload schema parses valid data", () => {
    expect(provider.payloadSchema.parse({count: 5})).toEqual({count: 5});
  });

  it("payload schema rejects invalid data", () => {
    expect(() => provider.payloadSchema.parse({count: "5"})).toThrow();
    expect(() => provider.payloadSchema.parse(null)).toThrow();
  });

  it("run() returns payload + findings", async () => {
    const result = await provider.run({
      workspaceRoot: "/tmp",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: [],
      env: process.env,
    });
    expect(result.payload).toEqual({count: 42});
    expect(result.findings).toEqual([]);
  });

  it("ProviderOutcome<P> is correctly typed", () => {
    expectTypeOf<ProviderOutcome<DummyPayload>["payload"]>().toEqualTypeOf<DummyPayload>();
  });
});
