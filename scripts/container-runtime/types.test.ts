/**
 * @fileoverview Tests for shared container runtime types and CLI error handling.
 * @module scripts/container-runtime/types.test
 */

import {afterEach, describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import {exitWithError} from "./types.ts";

// `exitWithError` is a deprecated compatibility surface kept only for the still-legacy Selfhost
// cohort (Task 21 removes it); every migrated declarative container command reports failures
// through its typed `CommandExecution` instead of ambient `process.exitCode`.
describe("exitWithError", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("prints Error messages and sets exit code 1", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    exitWithError(new Error("bad runtime"), logger);

    expect(sink.records).toEqual([
      {
        stream: "stderr",
        text: "[arolariu::test] ⛔ bad runtime",
        write: false,
      },
    ]);
    expect(process.exitCode).toBe(1);
  });

  it("prints non-Error values and sets exit code 1", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    exitWithError("bad runtime", logger);

    expect(sink.records[0]?.text).toContain("bad runtime");
    expect(process.exitCode).toBe(1);
  });
});
