// @vitest-environment node
/**
 * @fileoverview Tests for the Effect local image build/run program.
 * @module scripts/container-runtime/image.test
 *
 * @remarks
 * Every case runs on `makeTestLayer`: an in-memory filesystem seeded with the workspace manifests,
 * scripted preflight and engine processes, scripted taxonomy HTTP responses with a scripted
 * `unzip` that materializes the GS1 archive entry, and a recording sink. The frontend/backend
 * builds run the real `generateArtifacts`, so the `unzip` call and the taxonomy HTTP requests are
 * the evidence that artifact generation ran after preflight and before the build. The
 * characterization cases drive the real `containers build` CLI path (`runCli`); no module is mocked.
 */

import {join} from "node:path";

import {Duration, Effect, Exit, Fiber, FileSystem} from "effect";
import type {HttpClientRequest} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {makeContainersCommand} from "../commands/containers/cli.ts";
import {getExpectedTaxonomyArtifactPaths} from "../commands/generate/artifacts.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import {Environment} from "../platform/Environment.ts";
import {exitCodeFor} from "../platform/exit.ts";
import {
  effectTest,
  makeTestLayer,
  repositoryFixtureRoot,
  scriptedOutcomes,
  type ScriptedHttp,
  type ScriptedProcess,
  type TestHarness,
} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, runImage, shouldGenerateTaxonomyArtifacts} from "./image.ts";

/** Workspace manifests the engine selection and the artifact generation read. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
  "sites/arolariu.ro/.env": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture\nCLERK_SECRET_KEY=private-runtime-only\n",
  "sites/exp.arolariu.ro/config.docker.json": "{}",
};

/** Pinned GS1 archive URL. */
const GPC_URL = "https://ref.gs1.org/standards/gpc/2026-05/";

/** Exact archive entry the GPC generator extracts. */
const GPC_ENTRY = "GPC as of May 2026 (2026-05-20) EN.json";

/** Valid English GPC source document. */
const GPC_DOCUMENT = {
  LanguageCode: "EN",
  DateUtc: "2026-05-01",
  Schema: [
    {
      Level: 1,
      Code: 50000000,
      Title: "Food",
      Definition: null,
      DefinitionExcludes: null,
      Active: true,
      Childs: [{Level: 4, Code: 10000266, Title: "Bread", Definition: null, DefinitionExcludes: null, Active: true, Childs: []}],
    },
  ],
} as const;

/**
 * Builds a SPARQL JSON response body.
 *
 * @param bindings - Raw SPARQL bindings.
 * @returns The response status and body.
 */
function sparql(bindings: readonly unknown[]): ScriptedHttp["respond"] {
  return {status: 200, body: JSON.stringify({results: {bindings}})};
}

/**
 * Reads the SPARQL query text of a request.
 *
 * @param request - The HTTP request.
 * @returns The `query` URL parameter, or `""`.
 */
function sparqlQuery(request: HttpClientRequest.HttpClientRequest): string {
  return new URL(request.url).searchParams.get("query") ?? "";
}

/** Successful GPC, ECOICOP, and NACE responses. */
const TAXONOMY_SOURCES: readonly ScriptedHttp[] = [
  {match: (request) => request.url === GPC_URL, respond: {status: 200, body: "zip-archive"}},
  {
    match: (request) => sparqlQuery(request).includes("ecoicop2"),
    respond: sparql([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "01 Food"}}]),
  },
  {
    match: (request) => sparqlQuery(request).includes("nace2.1"),
    respond: sparql([{concept: {value: "nace:A"}, notation: {value: "A"}, label: {value: "A Agriculture"}}]),
  },
];

/** Every taxonomy source answers 503. */
const UNAVAILABLE_SOURCES: readonly ScriptedHttp[] = [{match: () => true, respond: {status: 503, body: "Unavailable"}}];

function succeeded(stdout = ""): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProbeOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

/** One `succeeded` outcome per Podman preflight probe: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightOutcomes: readonly ProbeOutcome[] = [succeeded(), succeeded(), succeeded(), succeeded(), succeeded(), succeeded()];

/** Harness filesystem the scripted `unzip` writes into; bound when a run starts. */
interface ExtractionState {
  fs?: FileSystem.FileSystem;
}

/**
 * Scripts `unzip`: writes the GPC entry into the requested directory.
 *
 * @param state - The bound harness filesystem.
 * @returns The scripted process.
 */
function archiveExtraction(state: ExtractionState): ScriptedProcess {
  return {
    match: (request) => request.command === "unzip",
    respond: (request) => {
      const outputDirectory = request.args[request.args.indexOf("-d") + 1];
      const fs = state.fs;
      if (outputDirectory === undefined || fs === undefined) {
        return Effect.die(new Error("The archive extraction fixture is not bound."));
      }
      return Effect.orDie(fs.writeFileString(join(outputDirectory, GPC_ENTRY), JSON.stringify(GPC_DOCUMENT))).pipe(
        Effect.as({stdout: "", stderr: "", durationMs: 0}),
      );
    },
  };
}

/** One image harness plus the extraction state it scripts. */
interface ImageFixture {
  readonly harness: TestHarness;
  readonly extraction: ExtractionState;
}

/**
 * Builds a harness for one image run.
 *
 * @param outcomes - Scripted preflight and engine outcomes in call order (`unzip` is answered separately).
 * @param http - Scripted taxonomy HTTP responses; defaults to the successful sources.
 * @returns The harness and its extraction state.
 */
function imageFixture(outcomes: readonly ProbeOutcome[] = [], http: readonly ScriptedHttp[] = TAXONOMY_SOURCES): ImageFixture {
  const extraction: ExtractionState = {};
  const queue = [...outcomes];
  const harness = makeTestLayer({
    context: "image",
    environment: {platform: "linux"},
    files: WORKSPACE_FILES,
    http,
    processes: [archiveExtraction(extraction), scriptedOutcomes(() => queue.shift() ?? succeeded())],
  });
  return {harness, extraction};
}

/**
 * Binds the scripted extraction to the harness filesystem, then runs the effect.
 *
 * @param extraction - The extraction state.
 * @param effect - The effect to run.
 * @returns The effect with the extraction bound.
 */
function bound<A, E, R>(extraction: ExtractionState, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | FileSystem.FileSystem> {
  return Effect.gen(function* () {
    extraction.fs = yield* FileSystem.FileSystem;
    return yield* effect;
  });
}

/**
 * Runs an effect while advancing the test clock until it completes, so retry backoff elapses.
 *
 * @param effect - The effect to run.
 * @returns The effect, completed under an advancing test clock.
 */
function advancingClock<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | TestClock.TestClock> {
  return Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect);
    while (fiber.pollUnsafe() === undefined) {
      yield* TestClock.adjust(Duration.millis(500));
      // Lets promise-based response body reads settle between clock steps.
      yield* Effect.promise(() => new Promise<void>((settle) => setTimeout(settle, 0)));
    }
    return yield* Fiber.join(fiber);
  });
}

/** Projects every recorded process call into plain values, naming the temporary extraction paths. */
function projectCalls(harness: TestHarness): readonly unknown[] {
  return harness.processCalls().map(({request, options}) => ({
    command: request.command,
    args: request.command === "unzip" ? ["-qq", "<archive>", "-d", "<directory>"] : [...request.args],
    options,
  }));
}

/** Projects every rendered record, without its trailing newline. */
function projectOutput(harness: TestHarness): readonly unknown[] {
  return harness.output().map((record) => ({stream: record.stream, text: record.text.replace(/\n$/u, "")}));
}

describe("buildImageBuildCommand", () => {
  it("passes feed policy as build secrets instead of copying its contents", () => {
    const command = buildImageBuildCommand(getContainerAdapter("podman"), {
      dockerfile: "infra/containers/Dockerfile.exp",
      tag: "arolariu-exp",
      context: ".",
      buildArgs: {},
      secrets: [{id: "pip_config", source: "C:\\private\\pip.conf"}],
    });

    expect(command.args).toContain("id=pip_config,src=C:\\private\\pip.conf");
    expect(command.args).toContain("--secret");
  });

  it("builds frontend image with Podman", () => {
    const command = buildImageBuildCommand(getContainerAdapter("podman"), {
      dockerfile: "infra/containers/Dockerfile.frontend",
      tag: "arolariu-frontend",
      context: ".",
      buildArgs: {VERSION: "local"},
    });

    expect(command).toEqual({
      command: "podman",
      args: [
        "build",
        "-f",
        "infra/containers/Dockerfile.frontend",
        "-t",
        "arolariu-frontend",
        "--build-arg",
        "VERSION=local",
        "--format",
        "docker",
        ".",
      ],
    });
  });
});

describe("buildImageRunCommand", () => {
  it("delivers private runtime configuration by variable name and mount path, not argument values", () => {
    const command = buildImageRunCommand(getContainerAdapter("podman"), {
      tag: "arolariu-exp",
      ports: ["5002:8080"],
      environment: {INFRA: "local"},
      environmentNames: ["CLERK_SECRET_KEY"],
      mounts: ["type=bind,source=C:\\private\\exp.json,target=/app/config.docker.json,readonly"],
    });

    expect(command.args).toEqual([
      "run",
      "--rm",
      "-p",
      "5002:8080",
      "-e",
      "CLERK_SECRET_KEY",
      "--mount",
      "type=bind,source=C:\\private\\exp.json,target=/app/config.docker.json,readonly",
      "-e",
      "INFRA=local",
      "arolariu-exp",
    ]);
  });

  it("runs backend image with Rancher", () => {
    const command = buildImageRunCommand(getContainerAdapter("rancher"), {
      tag: "arolariu-backend",
      ports: ["5000:8080"],
      environment: {INFRA: "local"},
    });

    expect(command).toEqual({
      command: "docker",
      args: ["run", "--rm", "-p", "5000:8080", "-e", "INFRA=local", "arolariu-backend"],
    });
  });
});

describe("shouldGenerateTaxonomyArtifacts", () => {
  it.each([
    ["frontend", true],
    ["backend", true],
    ["cv", false],
    ["exp", false],
  ] as const)("gates the artifact prerequisite for %s", (target, expected) => {
    expect(shouldGenerateTaxonomyArtifacts(target)).toBe(expected);
  });
});

describe("runImage", () => {
  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "preserves quoted and padded dotenv values through the private process environment",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            yield* fs.writeFileString(
              join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env"),
              'CLERK_SECRET_KEY="sk_test_private=literal"\nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_padded=="\n',
            );

            yield* runImage({action: "run", target: "frontend", engine: "podman"});

            const call = harness.processCalls().at(-1);
            expect(call?.options.env).toEqual({
              CLERK_SECRET_KEY: "sk_test_private=literal",
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_padded==",
            });
            expect(call?.request.args).toContain("CLERK_SECRET_KEY");
            expect(JSON.stringify(call?.request)).not.toContain("sk_test_private");
            expect(JSON.stringify(harness.output())).not.toContain("sk_test_private");
            expect(call?.request.args).not.toContain("--env-file");
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "rejects a missing explicitly selected feed policy before image build",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            const snapshot = yield* Environment;
            const result = yield* Effect.flip(
              runImage({action: "build", target: "exp", engine: "podman"}).pipe(
                Effect.provideService(Environment, {
                  ...snapshot,
                  variables: {...snapshot.variables, AROLARIU_CONTAINER_PIP_CONFIG: "/private/missing-pip.conf"},
                }),
              ),
            );
            expect(result._tag).toBe("ContainerRuntimeError");
            expect(harness.processCalls().some(({request}) => request.args[0] === "build")).toBe(false);
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "rejects a directory substituted for private exp configuration",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = join(repositoryFixtureRoot, "sites", "exp.arolariu.ro", "config.docker.json");
            yield* fs.remove(path);
            yield* fs.makeDirectory(path);

            const error = yield* Effect.flip(runImage({action: "run", target: "exp", engine: "podman"}));

            expect(error._tag).toBe("ContainerRuntimeError");
            expect(harness.processCalls().some(({request}) => request.args[0] === "run")).toBe(false);
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "passes only public website build inputs and keeps the private key out of commands",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            yield* runImage({action: "build", target: "frontend", engine: "podman"});

            const command = harness.processCalls().at(-1)?.request;
            expect(command?.args).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture");
            expect(JSON.stringify(harness.processCalls())).not.toContain("private-runtime-only");
            expect(JSON.stringify(harness.output())).not.toContain("private-runtime-only");
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "rejects missing private exp configuration before launching its image",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            yield* fs.remove(join(repositoryFixtureRoot, "sites", "exp.arolariu.ro", "config.docker.json"));

            const error = yield* Effect.flip(runImage({action: "run", target: "exp", engine: "podman"}));

            expect(error._tag).toBe("ContainerRuntimeError");
            expect(harness.processCalls().some(({request}) => request.args[0] === "run")).toBe(false);
          }),
        ),
      harness.layer,
    );
  }

  for (const [target, shouldGenerate] of [
    ["frontend", true],
    ["backend", true],
    ["cv", false],
    ["exp", false],
  ] as const) {
    const {harness, extraction} = imageFixture();
    effectTest(
      `gates the artifact prerequisite for ${target} builds`,
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            const result = yield* runImage({action: "build", target, engine: "podman"});

            // Assert
            expect(result).toEqual({engine: "podman", action: "build", target});
            expect(harness.processCalls().some((call) => call.request.command === "unzip")).toBe(shouldGenerate);
            expect(harness.httpCalls().length > 0).toBe(shouldGenerate);
            expect(harness.processCalls().at(-1)?.request.args.slice(0, 3)).toEqual([
              "build",
              "-f",
              `infra/containers/Dockerfile.${target}`,
            ]);
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture([...podmanPreflightOutcomes, succeeded("built\n")]);
    effectTest(
      "generates the artifacts silently after preflight and before the build",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            yield* runImage({action: "build", target: "backend", engine: "podman"});

            // Assert
            const commands = harness.processCalls().map((call) => `${call.request.command} ${call.request.args[0] ?? ""}`);
            expect(commands).toEqual([
              "podman --version",
              "docker version",
              "podman --version",
              "podman compose",
              "podman compose",
              "podman ps",
              "unzip -qq",
              "podman build",
            ]);
            const fs = yield* FileSystem.FileSystem;
            const written = yield* Effect.forEach(getExpectedTaxonomyArtifactPaths(repositoryFixtureRoot), (path) => fs.exists(path));
            expect(written.every(Boolean)).toBe(true);
            expect(projectOutput(harness)).toEqual([
              {
                stream: "stdout",
                text: "$ podman build -f infra/containers/Dockerfile.backend -t arolariu-backend --build-arg VERSION=local --format docker .",
              },
              {stream: "stdout", text: "built"},
            ]);
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "never generates artifacts for run actions",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            const result = yield* runImage({action: "run", target: "frontend", engine: "podman"});

            // Assert
            expect(result).toEqual({engine: "podman", action: "run", target: "frontend"});
            expect(harness.httpCalls()).toHaveLength(0);
            expect(harness.processCalls().map((call) => call.request.command)).not.toContain("unzip");
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture();
    effectTest(
      "runs the exact engine-owned run command with tee output",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            yield* runImage({action: "run", target: "exp", engine: "podman"});

            // Assert
            expect(harness.processCalls().at(-1)).toEqual({
              request: {
                command: "podman",
                args: [
                  "run",
                  "--rm",
                  "-p",
                  "5002:8080",
                  "--mount",
                  `type=bind,source=${join(repositoryFixtureRoot, "sites", "exp.arolariu.ro", "config.docker.json")},target=/app/config.docker.json,readonly`,
                  "-e",
                  "INFRA=local",
                  "-e",
                  "EXP_LOCAL_CONFIG_PATH=/app/config.docker.json",
                  "arolariu-exp",
                ],
              },
              options: {output: "tee", echo: false},
            });
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture([...podmanPreflightOutcomes, exited(1)]);
    effectTest(
      "fails with ProcessExited when the build exits with a nonzero code",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            const error = yield* Effect.flip(runImage({action: "build", target: "cv", engine: "podman"}));

            // Assert
            expect(error._tag).toBe("ProcessExited");
          }),
        ),
      harness.layer,
    );
  }

  {
    const {harness, extraction} = imageFixture([], UNAVAILABLE_SOURCES);
    effectTest(
      "does not build when artifact generation fails",
      () =>
        bound(
          extraction,
          Effect.gen(function* () {
            // Act
            const error = yield* Effect.flip(advancingClock(runImage({action: "build", target: "frontend", engine: "podman"})));

            // Assert
            expect(error._tag).toBe("TaxonomySourceUnavailable");
            const engineCalls = harness
              .processCalls()
              .filter((call) => call.request.command === "podman" && call.request.args[0] === "build");
            expect(engineCalls).toEqual([]);
            expect(harness.processCalls().map((call) => call.request.command)).toEqual([
              "podman",
              "docker",
              "podman",
              "podman",
              "podman",
              "podman",
            ]);
            expect(harness.httpCalls().length).toBeGreaterThan(0);
          }),
        ),
      harness.layer,
    );
  }

  {
    const extraction: ExtractionState = {};
    const preflight = [...podmanPreflightOutcomes];
    const harness = makeTestLayer({
      files: WORKSPACE_FILES,
      processes: [
        {match: (request) => request.args[0] === "run", respond: () => Effect.never},
        archiveExtraction(extraction),
        scriptedOutcomes(() => preflight.shift() ?? succeeded()),
      ],
    });
    effectTest(
      "interrupts the run command itself when the invocation is interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* Effect.forkChild(runImage({action: "run", target: "exp", engine: "podman"}));
          while (harness.processCalls().length < podmanPreflightOutcomes.length + 1) {
            yield* Effect.yieldNow;
          }

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(harness.processCalls()).toHaveLength(podmanPreflightOutcomes.length + 1);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// Characterization (R1 pins, now through the Effect `containers build` CLI path)
// ============================================================================

/**
 * Runs `containers build` once through the real CLI path.
 *
 * @param engine - Requested engine.
 * @param target - Image target.
 * @param outcomes - Scripted preflight and build outcomes.
 * @param json - Whether to pass `--json`.
 * @returns The exit code, projected process calls, HTTP request count, and rendered output.
 */
async function characterizeImageBuild(
  engine: "rancher" | "podman",
  target: "frontend" | "cv",
  outcomes: readonly ProbeOutcome[],
  json = false,
): Promise<unknown> {
  const {harness, extraction} = imageFixture(outcomes);
  const argv = ["containers", "build", "--target", target, "--engine", engine, ...(json ? ["--json"] : [])];

  const exit = await Effect.runPromiseExit(
    bound(extraction, runCli(argv, makeRootCommand([makeContainersCommand()]))).pipe(Effect.provide(harness.layer)),
  );

  return {
    exitCode: exitCodeFor(exit, undefined),
    taxonomyRequests: harness.httpCalls().length,
    calls: projectCalls(harness),
    output: projectOutput(harness),
  };
}

/** Recorded options of the full-output preflight probes. */
const PROBE = {failureOutput: "full"} as const;

/** Recorded options of the echoed, tee'd engine command. */
const TEE = {output: "tee", echo: false} as const;

/** The artifact generation's archive extraction, recorded between preflight and the build. */
const EXTRACTION = {command: "unzip", args: ["-qq", "<archive>", "-d", "<directory>"], options: {output: "capture"}};

describe("containers build characterization", () => {
  it("--target cv (rancher): no artifact generation, then the exact build args", async () => {
    expect(await characterizeImageBuild("rancher", "cv", [])).toEqual({
      exitCode: 0,
      taxonomyRequests: 0,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "docker",
          args: ["build", "-f", "infra/containers/Dockerfile.cv", "-t", "arolariu-cv", "--build-arg", "VERSION=local", "."],
          options: TEE,
        },
      ],
      output: [
        {stream: "stdout", text: "$ docker build -f infra/containers/Dockerfile.cv -t arolariu-cv --build-arg VERSION=local ."},
        {stream: "stdout", text: "[arolariu::image] ✅ Image build completed for target 'cv' with engine 'rancher'."},
      ],
    });
  });

  it("--target frontend (podman): artifact generation after preflight and before the exact build args", async () => {
    expect(
      await characterizeImageBuild("podman", "frontend", [
        succeeded(),
        exited(1),
        succeeded(),
        succeeded("podman-compose version 1.5.0"),
        succeeded("podman-compose version 1.5.0"),
        succeeded(),
        succeeded(),
      ]),
    ).toEqual({
      exitCode: 0,
      taxonomyRequests: 3,
      calls: [
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        EXTRACTION,
        {
          command: "podman",
          args: [
            "build",
            "-f",
            "infra/containers/Dockerfile.frontend",
            "-t",
            "arolariu-frontend",
            "--build-arg",
            "VERSION=local",
            "--build-arg",
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture",
            "--format",
            "docker",
            ".",
          ],
          options: TEE,
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "$ podman build -f infra/containers/Dockerfile.frontend -t arolariu-frontend --build-arg VERSION=local --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture --format docker .",
        },
        {stream: "stdout", text: "[arolariu::image] ✅ Image build completed for target 'frontend' with engine 'podman'."},
      ],
    });
  });

  // Intentional change (cohort 6 ledger): legacy generated the artifacts and built the image, then
  // failed with exit 1 ("selected JSON presentation without a JSON document"); the Effect command
  // writes the result as the single JSON document and exits per the business result.
  it("--target frontend (json): artifacts and the build run, then the result is the single JSON document and the exit code is 0", async () => {
    expect(await characterizeImageBuild("rancher", "frontend", [], true)).toEqual({
      exitCode: 0,
      taxonomyRequests: 3,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        EXTRACTION,
        {
          command: "docker",
          args: [
            "build",
            "-f",
            "infra/containers/Dockerfile.frontend",
            "-t",
            "arolariu-frontend",
            "--build-arg",
            "VERSION=local",
            "--build-arg",
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture",
            ".",
          ],
          options: TEE,
        },
      ],
      output: [
        {
          stream: "stdout",
          text: JSON.stringify({engine: "rancher", action: "build", target: "frontend"}, null, 2),
        },
      ],
    });
  });

  it("build exit: one diagnostic without evidence, exit 1", async () => {
    expect(await characterizeImageBuild("rancher", "cv", [succeeded(), succeeded(), succeeded(), succeeded(), exited(1)])).toMatchObject({
      exitCode: 1,
      output: [
        {stream: "stdout", text: "$ docker build -f infra/containers/Dockerfile.cv -t arolariu-cv --build-arg VERSION=local ."},
        {stream: "stderr", text: "[arolariu::image] ⛔ docker exited with code 1"},
      ],
    });
  });
});
