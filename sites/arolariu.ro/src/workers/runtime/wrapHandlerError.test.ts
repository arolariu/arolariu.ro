import {describe, expect, it} from "vitest";

import {wrapHandlerError} from "./wrapHandlerError";

describe("wrapHandlerError", () => {
  it("returns the original value when the handler resolves", async () => {
    const fn = wrapHandlerError(async (n: number) => n + 1);
    await expect(fn(3)).resolves.toBe(4);
  });

  it("throws an envelope object with __workerError=true when the handler throws", async () => {
    const fn = wrapHandlerError(async () => {
      throw new TypeError("boom");
    });
    const err = await fn().catch((e: unknown) => e);
    expect(err).toMatchObject({__workerError: true, name: "TypeError", message: "boom"});
    expect(typeof (err as {stack?: string}).stack).toBe("string");
  });

  it("falls back to String(cause) when the thrown value has no message", async () => {
    const fn = wrapHandlerError(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "raw-string";
    });
    const err = await fn().catch((e: unknown) => e);
    expect(err).toMatchObject({__workerError: true, name: "Error", message: "raw-string"});
  });

  it("preserves the function arity and forwards arguments", async () => {
    const fn = wrapHandlerError(async (a: string, b: string) => `${a}-${b}`);
    await expect(fn("x", "y")).resolves.toBe("x-y");
  });
});
