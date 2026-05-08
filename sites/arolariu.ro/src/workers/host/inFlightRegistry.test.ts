import {describe, expect, it, vi} from "vitest";

import {createInFlightRegistry} from "./inFlightRegistry";

describe("createInFlightRegistry", () => {
  it("registers an entry and returns a remove handle", () => {
    const reg = createInFlightRegistry();
    const reject = vi.fn();
    const remove = reg.register("doThing", reject);
    expect(reg.size).toBe(1);
    remove();
    expect(reg.size).toBe(0);
  });

  it("drainWithFactory builds a fresh error per entry from the snapshot of method names", () => {
    const reg = createInFlightRegistry();
    const a = vi.fn();
    const b = vi.fn();
    reg.register("a", a);
    reg.register("b", b);
    reg.drainWithFactory((methods) => new Error(`crash:${methods.join(",")}`));
    expect((a.mock.calls[0]?.[0] as Error).message).toBe("crash:a,b");
    expect((b.mock.calls[0]?.[0] as Error).message).toBe("crash:a,b");
    expect(reg.size).toBe(0);
  });

  it("a remove handle is idempotent (no double-decrement, no throw)", () => {
    const reg = createInFlightRegistry();
    const remove = reg.register("a", vi.fn());
    remove();
    remove();
    expect(reg.size).toBe(0);
  });
});
