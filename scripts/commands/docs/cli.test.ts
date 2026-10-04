// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `docs` command group.
 * @module scripts/commands/docs/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness: the seeded repository
 * fixture and scripted extractor processes drive the real documentation assembler. No module is
 * mocked.
 */

import {join} from "node:path";

import {Effect, FileSystem} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {createRepositoryPaths} from "../../common/repository-paths.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {ProcessExited, type ProcessRequest, type ProcessResult} from "../../platform/Process.ts";
import {makeTestLayer, repositoryFixtureRoot, type ScriptedProcess} from "../../platform/testing.ts";
import {makeDocsCommand} from "./cli.ts";

const PATHS = createRepositoryPaths(repositoryFixtureRoot);
const GENERATED_ROOT = join(PATHS.docsRoot, "_generated");
const SUCCEEDED: ProcessResult = {stdout: "", stderr: "", durationMs: 1};

/** Output directory each extractor writes one markdown file into. */
function outputDirectoryOf(request: ProcessRequest): string | undefined {
  if (request.command === "npx") {
    return join(GENERATED_ROOT, "ts-reference", request.args.includes("typedoc.components.json") ? "components" : "website");
  }
  if (request.command === "python") {
    return join(GENERATED_ROOT, "experimental");
  }
  return request.args[0] === "defaultdocumentation" ? request.args[request.args.indexOf("--OutputDirectoryPath") + 1] : undefined;
}

/** Outcome of one `docs` invocation. */
interface DocsRun {
  readonly code: CommandExitCode;
  readonly output: readonly SinkRecord[];
  readonly calls: number;
}

/**
 * Runs `docs` against `argv` on a fresh harness whose extractors write one file per tier.
 *
 * @param argv - Arguments after the program name.
 * @param failure - Optional scripted failure consulted before the simulated extractors.
 * @returns The exit code, the sink records, and the number of process calls.
 */
async function run(argv: readonly string[], failure?: ScriptedProcess): Promise<DocsRun> {
  let bound: FileSystem.FileSystem | undefined;
  const extractor: ScriptedProcess = {
    match: () => true,
    respond: (request) => {
      const dir = outputDirectoryOf(request);
      if (dir === undefined) {
        return Effect.succeed(SUCCEEDED);
      }
      if (bound === undefined) {
        return Effect.die(new Error("The extractor fixture is not bound."));
      }
      return Effect.orDie(Effect.andThen(bound.makeDirectory(dir, {recursive: true}), bound.writeFileString(join(dir, "page.md"), "# Page\n"))).pipe(
        Effect.as(SUCCEEDED),
      );
    },
  };
  const harness = makeTestLayer({
    files: {
      [PATHS.packageJson]: JSON.stringify({name: "@arolariu/monorepo"}),
      [join(PATHS.apiRoot, "src", "Common", "arolariu.Backend.Common.csproj")]: "<Project/>",
      [join(PATHS.root, "docs", "README.md")]: "# Docs\n",
    },
    processes: failure === undefined ? [extractor] : [failure, extractor],
  });
  const program = Effect.gen(function* () {
    bound = yield* FileSystem.FileSystem;
    return yield* runCli(argv, makeRootCommand([makeDocsCommand()]));
  });
  const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), output: harness.output(), calls: harness.processCalls().length};
}

describe("docs command", () => {
  it("assembles the documentation and prints the legacy completion line", async () => {
    // Act
    const result = await run(["docs", "assemble"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toBe(5);
    expect(result.output.at(-1)).toEqual({stream: "stdout", text: "[arolariu::docs] ✅ Assembled documentation from 3 extractor(s) across 4 tier(s).\n"});
  });

  it("writes the result as the single JSON document in --json mode", async () => {
    // Act
    const result = await run(["docs", "assemble", "--json"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.output).toEqual([
      {
        stream: "stdout",
        text: `${JSON.stringify({generatedTiers: ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"], extractorCount: 3}, null, 2)}\n`,
      },
    ]);
  });

  it("fails with exit 1 when an extractor fails", async () => {
    // Arrange
    const failure: ScriptedProcess = {
      match: (request) => request.command === "python",
      respond: new ProcessExited({
        command: "python -m pydoc_markdown.main",
        stdout: "",
        stderr: "boom",
        durationMs: 1,
        exitCode: 1,
        message: "python -m pydoc_markdown.main exited with code 1",
      }),
    };

    // Act
    const result = await run(["docs", "assemble"], failure);

    // Assert
    expect(result.code).toBe(1);
    expect(result.output.some((record) => record.text.includes("Assembled documentation"))).toBe(false);
  });

  it("prints help without assembling when run without a subcommand", async () => {
    // Act
    const result = await run(["docs"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toBe(0);
    expect(
      result.output
        .filter((record) => record.stream === "stdout")
        .map((record) => record.text)
        .join(""),
    ).toContain("assemble");
  });
});
