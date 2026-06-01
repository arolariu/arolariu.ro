/**
 * @fileoverview Tests for container runtime process execution.
 * @module scripts/container-runtime/process.test
 */

import {describe, expect, it} from "vitest";
import {defaultRunner, formatCommand, makeDryRunRunner} from "./process.ts";

describe("formatCommand", () => {
  it("formats commands for diagnostics", () => {
    expect(formatCommand({command: "podman", args: ["compose", "up", "-d"]})).toBe("podman compose up -d");
  });

  it("quotes arguments containing spaces", () => {
    expect(formatCommand({command: "docker", args: ["exec", "my container"]})).toBe('docker exec "my container"');
  });
});

describe("makeDryRunRunner", () => {
  it("records commands without executing them", async () => {
    const runner = makeDryRunRunner();

    const result = await runner.run({command: "podman", args: ["--version"]});

    expect(result).toEqual({code: 0, output: ""});
    expect(runner.commands).toEqual(["podman --version"]);
  });
});

describe("defaultRunner", () => {
  it("merges provided environment with process environment", async () => {
    const result = await defaultRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write(process.env.CONTAINER_RUNTIME_TEST_VALUE ?? '')"],
      },
      {
        env: {CONTAINER_RUNTIME_TEST_VALUE: "merged-env"},
      },
    );

    expect(result).toEqual({code: 0, output: "merged-env"});
  });
});
