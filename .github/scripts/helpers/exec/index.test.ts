import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {beforeAll, describe, expect, it} from "vitest";

let execution: typeof import("./index.ts") | undefined;

beforeAll(async () => {
  const url = new URL("./index.ts", import.meta.url);
  if (existsSync(fileURLToPath(url))) execution = await import(url.href);
});

describe("checked execution", () => {
  it("returns captured output and preserves native listeners on success", async () => {
    expect(execution?.execChecked).toBeTypeOf("function");
    if (!execution) return;
    let observed = "";
    const result = await execution.execChecked(process.execPath, ["-e", 'process.stdout.write("captured")'], {
      silent: true,
      listeners: {
        stdout: (buffer) => {
          observed += buffer.toString("utf8");
        },
      },
    });
    expect(result).toEqual({exitCode: 0, stdout: "captured", stderr: ""});
    expect(observed).toBe("captured");
  });

  it("rejects a nonzero exit while retaining both diagnostic streams", async () => {
    expect(execution?.execChecked).toBeTypeOf("function");
    if (!execution) return;
    let caught: unknown;
    try {
      await execution.execChecked(
        process.execPath,
        ["-e", 'process.stdout.write("out"); process.stderr.write("err"); process.exitCode = 7;'],
        {silent: true},
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(execution.CommandExecutionError);
    expect(caught).toMatchObject({command: process.execPath, exitCode: 7, stdout: "out", stderr: "err"});
  });
});
