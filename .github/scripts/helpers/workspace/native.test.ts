import {execFile} from "node:child_process";
import {copyFile, mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, join} from "node:path";
import {promisify} from "node:util";
import {expect, it} from "vitest";

const execute = promisify(execFile);

it("starts the facts worker with a real Node executable path containing spaces", async () => {
  const directory = await mkdtemp(join(tmpdir(), "workspace broker node "));
  try {
    const executable = join(directory, basename(process.execPath));
    await copyFile(process.execPath, executable);
    const broker = new URL("./index.ts", import.meta.url).href;
    const code = `const {runWorkspaceInspection} = await import(${JSON.stringify(broker)}); const result = await runWorkspaceInspection(${JSON.stringify(directory)}); console.log(JSON.stringify(result));`;
    const processResult = execute(executable, ["--input-type=module", "--eval", code], {cwd: directory, timeout: 30_000});
    await expect(processResult).resolves.toMatchObject({stderr: ""});
    const {stdout} = await processResult;
    const result: unknown = JSON.parse(stdout);
    expect(result).toMatchObject({exitCode: 1, stdout: ""});
    if (typeof result !== "object" || result === null || !("stderr" in result) || typeof result.stderr !== "string")
      throw new Error("Missing captured worker error");
    expect(result.stderr).toContain("workspace-facts.worker.ts");
  } finally {
    await rm(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
  }
}, 60_000);
