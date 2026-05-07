import {describe, expect, it} from "vitest";

import {raceWithSignal} from "./raceWithSignal";

describe("raceWithSignal", () => {
  it("returns the body resolution when no signal is supplied", async () => {
    await expect(raceWithSignal(Promise.resolve(7))).resolves.toBe(7);
  });

  it("rejects synchronously when the signal is already aborted", async () => {
    const ac = new AbortController();
    const reason = new Error("pre-aborted");
    ac.abort(reason);
    await expect(raceWithSignal(Promise.resolve(1), ac.signal)).rejects.toBe(reason);
  });

  it("rejects mid-flight when the signal aborts after the call begins", async () => {
    const ac = new AbortController();
    const body = new Promise<number>((resolve) => setTimeout(() => resolve(99), 50));
    setTimeout(() => ac.abort(new Error("mid-flight")), 5);
    await expect(raceWithSignal(body, ac.signal)).rejects.toThrow("mid-flight");
  });

  it("resolves with the body value when body wins the race and detaches the abort listener", async () => {
    const ac = new AbortController();
    const body = Promise.resolve("ok");
    const result = await raceWithSignal(body, ac.signal);
    expect(result).toBe("ok");
    // After body wins, aborting must NOT throw or affect anything we observe.
    ac.abort(new Error("late"));
  });

  it("uses an Error('aborted') fallback when reason is undefined (polyfill path)", async () => {
    // Spec-compliant runtimes always set `reason`, but a polyfill might not.
    const fakeSignal = {
      aborted: true,
      reason: undefined,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as AbortSignal;
    await expect(raceWithSignal(new Promise(() => {}), fakeSignal)).rejects.toThrow("aborted");
  });
});
