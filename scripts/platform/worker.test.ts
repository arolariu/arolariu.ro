// @vitest-environment node
/**
 * @fileoverview Tests for the worker entry-point core.
 * @module scripts/platform/worker.test
 *
 * @remarks
 * {@link runWorkerProgram} runs over the in-memory harness in JSON mode. The live case spawns the
 * real Nx workspace worker (`scripts/inspection/workspace.worker.ts`, whose `import.meta.main`
 * block calls `runWorker`) through the live `Process` service against a one-project Nx workspace
 * created in the operating-system temporary directory, so it never adds a project to this
 * repository's own graph.
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {Cause, Effect, Exit} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {CommandInputError} from "../common/commander.ts";
import {ReportedFailure} from "./exit.ts";
import {makeNodeLayer} from "./layers.ts";
import {Process} from "./Process.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, runScoped} from "./testing.ts";
import {runWorkerProgram, type WorkerOptions} from "./worker.ts";

/**
 * Builds a worker definition over a fixed program.
 *
 * @param overrides - Members replacing the defaults.
 * @returns The worker definition.
 */
function worker<A, E>(overrides: Partial<WorkerOptions<number, A, E>> & Pick<WorkerOptions<number, A, E>, "program">): WorkerOptions<number, A, E> {
  return {name: "w", decode: () => 1, encode: (value) => ({value: String(value)}), ...overrides};
}

describe("runWorkerProgram", () => {
  const written = makeTestLayer({mode: "json"});
  effectTest(
    "writes exactly one JSON document",
    () =>
      Effect.gen(function* () {
        // Act
        yield* runWorkerProgram({name: "w", decode: () => 1, program: (n) => Effect.succeed({n}), encode: (v) => v}, []);

        // Assert
        expect(written.output()).toEqual([{stream: "stdout", text: '{\n  "n": 1\n}\n'}]);
      }),
    written.layer,
  );

  const decodedArgs: (readonly string[])[] = [];
  const decoding = makeTestLayer({mode: "json"});
  effectTest(
    "decodes the supplied arguments",
    () =>
      Effect.gen(function* () {
        // Act
        yield* runWorkerProgram(
          worker({
            decode: (argv) => {
              decodedArgs.push(argv);
              return argv.length;
            },
            program: (count) => Effect.succeed(count),
          }),
          ["a", "b"],
        );

        // Assert
        expect(decodedArgs).toEqual([["a", "b"]]);
        expect(decoding.output()).toEqual([{stream: "stdout", text: '{\n  "value": "2"\n}\n'}]);
      }),
    decoding.layer,
  );

  let programRan = false;
  const usage = makeTestLayer({mode: "json"});
  effectTest(
    "fails with usage when decode throws",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(
          runWorkerProgram(
            worker({
              decode: () => {
                throw new CommandInputError("bad");
              },
              program: () =>
                Effect.sync(() => {
                  programRan = true;
                }),
            }),
            [],
          ),
        );

        // Assert
        expect(exit).toEqual(Exit.fail(new ReportedFailure({exitCode: 2, message: "bad"})));
        expect(programRan).toBe(false);
        expect(usage.output().filter((record) => record.stream === "stdout")).toEqual([]);
        expect(usage.output()).toEqual([{stream: "stderr", text: "bad\n"}]);
      }),
    usage.layer,
  );

  const defect = makeTestLayer({mode: "json"});
  effectTest(
    "diagnoses a defect on stderr and re-raises it",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(runWorkerProgram(worker({program: () => Effect.die(new Error("broken"))}), []));

        // Assert
        expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
        expect(defect.output()).toEqual([{stream: "stderr", text: "broken\n"}]);
      }),
    defect.layer,
  );

  const typed = makeTestLayer({mode: "json"});
  effectTest(
    "diagnoses a typed failure on stderr and re-raises it unchanged",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(runWorkerProgram(worker({program: () => Effect.fail(new Error("typed"))}), []));

        // Assert
        expect(exit).toEqual(Exit.fail(new Error("typed")));
        expect(typed.output()).toEqual([{stream: "stderr", text: "typed\n"}]);
      }),
    typed.layer,
  );

  const reported = makeTestLayer({mode: "json"});
  effectTest(
    "leaves an already reported failure undiagnosed",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(
          runWorkerProgram(worker({program: () => Effect.fail(new ReportedFailure({exitCode: 1, message: "done"}))}), []),
        );

        // Assert
        expect(exit).toEqual(Exit.fail(new ReportedFailure({exitCode: 1, message: "done"})));
        expect(reported.output()).toEqual([]);
      }),
    reported.layer,
  );

  const interrupted = makeTestLayer({mode: "json"});
  effectTest(
    "renders nothing when the program is interrupted",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(runWorkerProgram(worker({program: () => Effect.interrupt}), []));

        // Assert
        expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
        expect(interrupted.output()).toEqual([]);
      }),
    interrupted.layer,
  );
});

/** Wall-clock budget for the live Nx worker round trip (normally a few seconds). */
const LIVE_WORKER_TIMEOUT_MS = 120_000;

const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

describe("runWorker live round trip", () => {
  it(
    "runs the Nx workspace worker as a child process and emits one workspace document",
    async () => {
      // Arrange: a one-project Nx workspace outside the repository.
      const root = await mkdtemp(join(tmpdir(), "arolariu-worker-fixture-"));
      fixtureRoots.push(root);
      await mkdir(join(root, "libs", "alpha"), {recursive: true});
      await Promise.all([
        writeFile(join(root, "nx.json"), "{}\n", "utf8"),
        writeFile(join(root, "package.json"), '{"name": "worker-fixture", "private": true}\n', "utf8"),
        writeFile(join(root, "libs", "alpha", "project.json"), '{"name": "alpha", "targets": {"build": {"command": "echo build"}}}\n', "utf8"),
      ]);
      const workerPath = join(repositoryFixtureRoot, "scripts", "inspection", "workspace.worker.ts");

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (process_) =>
          process_.run(
            {command: process.execPath, args: [workerPath, root]},
            {
              cwd: root,
              output: "capture",
              timeout: "100 seconds",
              env: {
                NX_DAEMON: "false",
                NX_LOAD_DOT_ENV_FILES: "false",
                NX_PLUGIN_NO_TIMEOUTS: "true",
                NX_WORKSPACE_ROOT_PATH: root,
                NX_WORKSPACE_DATA_DIRECTORY: join(root, ".nx-test", "workspace-data"),
                NX_CACHE_DIRECTORY: join(root, ".nx-test", "cache"),
              },
            },
          ),
        ),
        makeNodeLayer({mode: "silent", verbose: false, color: false, context: "test"}),
      );

      // Assert
      const document: unknown = JSON.parse(result.stdout);
      expect(document).toMatchObject({
        nodes: {alpha: {name: "alpha", data: {root: "libs/alpha"}}},
        dependencies: {alpha: []},
      });
    },
    LIVE_WORKER_TIMEOUT_MS,
  );
});
