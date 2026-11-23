// @vitest-environment node
/**
 * @fileoverview Tests for the Effect local image build/run program.
 * @module scripts/container-runtime/image.test
 *
 * @remarks
 * Every case runs on `makeTestLayer`: an in-memory filesystem seeded with the workspace manifests,
 * scripted preflight and engine processes, and a recording sink.
 * Frontend/backend builds run the real pinned snapshot verifier, not the publisher clients. The
 * characterization cases drive the real `containers build` CLI path (`runCli`); no module is mocked.
 */

import {join} from "node:path";

import {Effect, Exit, Fiber, FileSystem} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {makeContainersCommand} from "../commands/containers/cli.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import {Environment} from "../platform/Environment.ts";
import {exitCodeFor} from "../platform/exit.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, scriptedOutcomes, type TestHarness} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, runImage} from "./image.ts";

/** Workspace manifests the engine selection and the artifact generation read. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
  "sites/arolariu.ro/.env": "NEXT_PUBLIC_SERVICE_KEY=public-fixture\nRUNTIME_API_KEY=private-runtime-only\n",
  "sites/exp.arolariu.ro/config.docker.json": "{}",
};

function succeeded(stdout = ""): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProbeOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

/** One `succeeded` outcome per Podman preflight probe: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightOutcomes: readonly ProbeOutcome[] = [succeeded(), succeeded(), succeeded(), succeeded(), succeeded(), succeeded()];

function imageFixture(outcomes: readonly ProbeOutcome[] = [], withWebsiteManifest = true): {readonly harness: TestHarness} {
  const queue = [...outcomes];
  const files = {...WORKSPACE_FILES};
  if (!withWebsiteManifest) delete files["sites/arolariu.ro/package.json"];
  return {
    harness: makeTestLayer({
      context: "image",
      environment: {platform: "linux"},
      files,
      processes: [scriptedOutcomes(() => queue.shift() ?? succeeded())],
    }),
  };
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
      environmentNames: ["RUNTIME_API_KEY"],
      mounts: ["type=bind,source=C:\\private\\exp.json,target=/app/config.docker.json,readonly"],
    });

    expect(command.args).toEqual([
      "run",
      "--rm",
      "-p",
      "5002:8080",
      "-e",
      "RUNTIME_API_KEY",
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

describe("runImage", () => {
  {
    const {harness} = imageFixture();
    effectTest(
      "preserves quoted and padded dotenv values through the private process environment",
      () =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          yield* fs.writeFileString(
            join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env"),
            'RUNTIME_API_KEY="private=literal"\nNEXT_PUBLIC_SERVICE_KEY="public-padded=="\n',
          );

          yield* runImage({action: "run", target: "frontend", engine: "podman"});

          const call = harness.processCalls().at(-1);
          expect(call?.options.env).toEqual({
            RUNTIME_API_KEY: "private=literal",
            NEXT_PUBLIC_SERVICE_KEY: "public-padded==",
          });
          expect(call?.request.args).toContain("RUNTIME_API_KEY");
          expect(JSON.stringify(call?.request)).not.toContain("private=literal");
          expect(JSON.stringify(harness.output())).not.toContain("private=literal");
          expect(call?.request.args).not.toContain("--env-file");
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "rejects a missing explicitly selected feed policy before image build",
      () =>
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
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "rejects a directory substituted for private exp configuration",
      () =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = join(repositoryFixtureRoot, "sites", "exp.arolariu.ro", "config.docker.json");
          yield* fs.remove(path);
          yield* fs.makeDirectory(path);

          const error = yield* Effect.flip(runImage({action: "run", target: "exp", engine: "podman"}));

          expect(error._tag).toBe("ContainerRuntimeError");
          expect(harness.processCalls().some(({request}) => request.args[0] === "run")).toBe(false);
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "delivers provider-independent website build configuration only through a secret file",
      () =>
        Effect.gen(function* () {
          yield* runImage({action: "build", target: "frontend", engine: "podman"});

          const command = harness.processCalls().at(-1)?.request;
          expect(command?.args).toContain(`id=website_env,src=${join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env")}`);
          expect(JSON.stringify(command)).not.toContain("public-fixture");
          expect(JSON.stringify(harness.processCalls())).not.toContain("private-runtime-only");
          expect(JSON.stringify(harness.output())).not.toContain("private-runtime-only");
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "rejects missing private exp configuration before launching its image",
      () =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          yield* fs.remove(join(repositoryFixtureRoot, "sites", "exp.arolariu.ro", "config.docker.json"));

          const error = yield* Effect.flip(runImage({action: "run", target: "exp", engine: "podman"}));

          expect(error._tag).toBe("ContainerRuntimeError");
          expect(harness.processCalls().some(({request}) => request.args[0] === "run")).toBe(false);
        }),
      harness.layer,
    );
  }

  for (const [target, hasLicenses] of [
    ["frontend", true],
    ["backend", false],
    ["cv", false],
    ["exp", false],
  ] as const) {
    const {harness} = imageFixture();
    effectTest(
      `gates the artifact prerequisite for ${target} builds`,
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runImage({action: "build", target, engine: "podman"});

          // Assert
          expect(result).toEqual({engine: "podman", action: "build", target});
          expect(harness.processCalls().some((call) => call.request.command === "unzip")).toBe(false);
          expect(harness.httpCalls()).toEqual([]);
          const fs = yield* FileSystem.FileSystem;
          expect(yield* fs.exists(join(repositoryFixtureRoot, "sites", "arolariu.ro", "licenses.json"))).toBe(hasLicenses);
          expect(harness.processCalls().at(-1)?.request.args.slice(0, 3)).toEqual(["build", "-f", `infra/containers/Dockerfile.${target}`]);
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture([...podmanPreflightOutcomes, succeeded("built\n")]);
    effectTest(
      "runs the backend build without publisher preparation after preflight",
      () =>
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
            "podman build",
          ]);
          expect(projectOutput(harness)).toEqual([
            {
              stream: "stdout",
              text: "$ podman build -f infra/containers/Dockerfile.backend -t arolariu-backend --build-arg VERSION=local --format docker .",
            },
            {stream: "stdout", text: "built"},
          ]);
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "never generates artifacts for run actions",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runImage({action: "run", target: "frontend", engine: "podman"});

          // Assert
          expect(result).toEqual({engine: "podman", action: "run", target: "frontend"});
          expect(harness.httpCalls()).toHaveLength(0);
          expect(harness.processCalls().map((call) => call.request.command)).not.toContain("unzip");
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture();
    effectTest(
      "runs the exact engine-owned run command with tee output",
      () =>
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
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture([...podmanPreflightOutcomes, exited(1)]);
    effectTest(
      "fails with ProcessExited when the build exits with a nonzero code",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runImage({action: "build", target: "cv", engine: "podman"}));

          // Assert
          expect(error._tag).toBe("ProcessExited");
        }),
      harness.layer,
    );
  }

  {
    const {harness} = imageFixture([], false);
    effectTest(
      "does not build when the frontend dependency manifest is missing",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runImage({action: "build", target: "frontend", engine: "podman"}));

          // Assert
          expect(error._tag).toBe("ArtifactGenerationFailed");
          const fs = yield* FileSystem.FileSystem;
          expect(yield* fs.exists(join(repositoryFixtureRoot, "sites", "arolariu.ro", "licenses.json"))).toBe(false);
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
          expect(harness.httpCalls()).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const preflight = [...podmanPreflightOutcomes];
    const harness = makeTestLayer({
      files: WORKSPACE_FILES,
      processes: [
        {match: (request) => request.args[0] === "run", respond: () => Effect.never},
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
  const {harness} = imageFixture(outcomes);
  const argv = ["containers", "build", "--target", target, "--engine", engine, ...(json ? ["--json"] : [])];

  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeContainersCommand()])).pipe(Effect.provide(harness.layer)));

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
      taxonomyRequests: 0,
      calls: [
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
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
            "--secret",
            `id=website_env,src=${join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env")}`,
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
          text: `$ podman build -f infra/containers/Dockerfile.frontend -t arolariu-frontend --build-arg VERSION=local --secret id=website_env,src=${join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env")} --format docker .`,
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
      taxonomyRequests: 0,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
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
            "--secret",
            `id=website_env,src=${join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env")}`,
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
