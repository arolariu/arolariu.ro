import {describe, expect, it} from "vitest";

import {
  WorkerCrashError,
  WorkerDeadError,
  WorkerError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "../workerErrors";

describe("WorkerError", () => {
  it("captures cause and method, and is an Error instance", () => {
    const cause = new Error("inner");
    const err = new WorkerError(cause, "generate");
    expect(err).toBeInstanceOf(Error);
    expect(err.cause).toBe(cause);
    expect(err.method).toBe("generate");
    expect(err.name).toBe("WorkerError");
    expect(err.message).toContain("generate");
  });
});

describe("WorkerCrashError", () => {
  it("captures the names of in-flight methods", () => {
    const err = new WorkerCrashError(["generate", "load"]);
    expect(err).toBeInstanceOf(Error);
    expect(err.inFlightMethods).toEqual(["generate", "load"]);
    expect(err.name).toBe("WorkerCrashError");
  });

  it("accepts an empty list", () => {
    const err = new WorkerCrashError([]);
    expect(err.inFlightMethods).toEqual([]);
  });
});

describe("WorkerTimeoutError", () => {
  it("captures method and elapsed time", () => {
    const err = new WorkerTimeoutError("generate", 5000);
    expect(err).toBeInstanceOf(Error);
    expect(err.method).toBe("generate");
    expect(err.elapsedMs).toBe(5000);
    expect(err.name).toBe("WorkerTimeoutError");
    expect(err.message).toContain("5000");
  });
});

describe("WorkerDeadError", () => {
  it("is a plain Error subclass", () => {
    const err = new WorkerDeadError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WorkerDeadError");
  });
});

describe("WorkerNotAvailableError", () => {
  it("is a plain Error subclass", () => {
    const err = new WorkerNotAvailableError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WorkerNotAvailableError");
  });
});
