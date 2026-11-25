// @vitest-environment node
import {Effect, FileSystem, Layer, PlatformError, Sink, Stream} from "effect";
import {type ChildProcess, ChildProcessSpawner} from "effect/process";
import {describe, expect, it} from "vitest";

import {Process, ProcessLive, type ProcessRequest} from "../platform/Process.ts";
import {createRepositoryPaths} from "../common/repository-paths.ts";
import {setupActionsLayer} from "../commands/setup/actions.ts";
import {createDotnetSetupPhase} from "../commands/setup/phases/dotnet.ts";
import {recordingInspection} from "../commands/setup/phase-testing.ts";
import {recordWorktreeRestoreEvidence} from "../commands/setup/worktreeRestoreEvidence.ts";
import {inspectionProbeRunner, probes} from "../inspection/probes.ts";
import {currentWorktreeRestoreEvidence} from "../inspection/worktreeRestore.ts";
import {Environment} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import {makeTestLayer, scriptedOutcomes} from "../platform/testing.ts";
import {localWorktreePlatform} from "./worktreePlatform.ts";
import {inspectWorktreeAspire, observeWorktreeCheckout, observeWorktreeEngine} from "./worktreePreflight.ts";

const root = "C:/worktrees/task";
const commonGitDir = "C:/repo/.git";
const forcedRestoreRequest = {command: "dotnet", args: ["restore", createRepositoryPaths(root).solution, "--force"]} as const;
const forcedRestore = commandLine(forcedRestoreRequest);
const guardedRestore = commandLine({...forcedRestoreRequest, args: [...forcedRestoreRequest.args, "-noAutoResponse"]});
const head = "0123456789abcdef0123456789abcdef01234567";
const gitCheckoutArgs = ["rev-parse", "--show-toplevel", "--absolute-git-dir", "--git-common-dir", "--show-superproject-working-tree"];
const canary = "must-not-appear-in-preflight";
const trustedBackend = JSON.stringify({version: {Version: "6.2.1"}, host: {os: "linux", hostname: canary}, store: {}});
const registeredWorktree = `worktree ${root}\0HEAD ${head}\0branch refs/heads/chore/task\0\0`;
const localMachineContext = {
  Name: "local-machine",
  Default: true,
  URI: "ssh://dev@127.0.0.1:52000/run/user/1000/podman/podman.sock",
  Identity: "C:/keys/id",
};
const localMachineSsh = {Port: 52000, RemoteUsername: "dev", IdentityPath: "C:/keys/id"};
const localMachineInspect = {
  Name: "local-machine",
  State: "running",
  Rootful: false,
  ConfigDir: {Path: "C:/podman/wsl"},
  SSHConfig: localMachineSsh,
  Created: "2026-11-25T10:20:30.123456789Z",
};
const exp = "sites/exp.arolariu.ro";
const venv = `${exp}/.venv`;
const cache = "C:/nuget";
const tool = `${cache}/aspire.cli/13.6.5`;
const toolDir = `${tool}/tools/net10.0/any`;
const profile = "C:/user";
const aspireHome = `${profile}/.aspire`;
const appHostName = "tooling/src/AppHost/AppHost.csproj";
const appHostProject = `<Project Sdk="Microsoft.NET.Sdk"><Sdk Name="Aspire.AppHost.Sdk" Version="13.6.5" />
  <PropertyGroup><AspireUseCliBundle>true</AspireUseCliBundle><AspireCliInvocationMode>DnxPinned</AspireCliInvocationMode><UserSecretsId>test-apphost</UserSecretsId></PropertyGroup>
  <ItemGroup><PackageReference Include="Aspire.Hosting.AppHost" /></ItemGroup></Project>`;
const receiptPath = "tooling/src/AppHost/obj/worktree-restore-evidence.json";
const graphPath = "tooling/src/AppHost/obj/project.assets.json";
const lockPath = "tooling/src/AppHost/obj/.worktree-restore-evidence.lock";
const userConfig = "C:/appdata/NuGet/NuGet.Config";
const machineConfig = "C:/Program Files (x86)/NuGet/Config/Offline.config";
const configFiles = {
  [userConfig]:
    '<configuration><packageSourceMapping><packageSource key="test"><package pattern="Example.*" /></packageSource></packageSourceMapping></configuration>',
  [machineConfig]: '<configuration><config><add key="globalPackagesFolder" value="C:/nuget" /></config></configuration>',
};
const secretPath = "C:/appdata/Microsoft/UserSecrets/test-apphost/secrets.json";
const siteEnv = [
  "SITE_ENV=development",
  "SITE_NAME=website",
  "SITE_URL=https://localhost",
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${canary}`,
  `CLERK_SECRET_KEY=${canary}`,
].join("\n");
const nextFiles = {
  "package-lock.json": JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": {name: "@arolariu/monorepo"},
      "node_modules/next": {version: "16.4.6"},
      "node_modules/@next/swc-win32-x64-msvc": {version: "16.4.6", optional: true},
    },
  }),
  "node_modules/next/package.json": JSON.stringify({version: "16.4.6", optionalDependencies: {"@next/swc-win32-x64-msvc": "16.4.6"}}),
  "node_modules/@next/swc-win32-x64-msvc/package.json": JSON.stringify({
    name: "@next/swc-win32-x64-msvc",
    version: "16.4.6",
    main: "next-swc.win32-x64-msvc.node",
  }),
};
const packageHash = `${"a".repeat(86)}==`;
const assetPackage = "example.sdk/1.2.3";
const assetFile = "lib/net10.0/Example.dll";
const packageDir = `${cache}/${assetPackage}`;
const restoreFiles = {
  "C:/sdk/10.0.404/MSBuild.dll": "synthetic SDK directory marker",
  "arolariu.slnx": `<Solution><Project Path="${appHostName}" /></Solution>`,
  "tooling/src/AppHost/obj/project.assets.json": JSON.stringify({
    version: 4,
    project: {restore: {projectPath: `${root}/${appHostName}`, configFilePaths: [userConfig, machineConfig]}},
    projectFileDependencyGroups: {"net10.0": ["Example.Sdk >= 1.2.3"]},
    packageFolders: {[cache]: {}},
    libraries: {"Example.Sdk/1.2.3": {type: "package", path: assetPackage, sha512: packageHash}},
    targets: {"net10.0": {"Example.Sdk/1.2.3": {type: "package", runtime: {[assetFile]: {}}}}},
  }),
  "tooling/src/AppHost/obj/AppHost.csproj.nuget.g.props": "<Project />",
  "tooling/src/AppHost/obj/AppHost.csproj.nuget.g.targets": "<Project />",
  [`${packageDir}/.nupkg.metadata`]: JSON.stringify({version: 2, contentHash: packageHash}),
  [`${packageDir}/example.sdk.1.2.3.nupkg.sha512`]: `${"b".repeat(86)}==`,
  [`${packageDir}/example.sdk.nuspec`]: "<package/>",
  ...configFiles,
};

function portableExecutable(machine = 0x8664): Uint8Array {
  const contents = new Uint8Array(1024);
  const view = new DataView(contents.buffer);
  view.setUint16(0, 0x5a4d, true);
  view.setUint32(60, 64, true);
  view.setUint32(64, 0x4550, true);
  view.setUint16(68, machine, true);
  view.setUint16(70, 1, true);
  view.setUint16(84, 112, true);
  view.setUint16(88, machine === 0x014c ? 0x010b : 0x020b, true);
  view.setUint32(216, 512, true);
  view.setUint32(220, 512, true);
  return contents;
}

const cliBundleFiles = {
  [`${cache}/aspire.apphost.sdk/13.6.5/Sdk/Sdk.targets`]: "<Project />",
  [`${cache}/aspire.apphost.sdk/13.6.5/Sdk/Sdk.props`]: "<Project />",
  [`${tool}/aspire.cli.nuspec`]: "<package><metadata><id>Aspire.Cli</id><version>13.6.5</version></metadata></package>",
  [`${tool}/.nupkg.metadata`]: "{}",
  [`${toolDir}/DotnetToolSettings.xml`]:
    '<DotNetCliTool Version="1"><Commands><Command Name="aspire" EntryPoint="aspire.dll" Runner="dotnet" /></Commands></DotNetCliTool>',
  [`${toolDir}/aspire.runtimeconfig.json`]:
    '{"runtimeOptions":{"tfm":"net10.0","framework":{"name":"Microsoft.NETCore.App","version":"10.0.0"}}}',
  [`${toolDir}/aspire.deps.json`]: JSON.stringify({
    runtimeTarget: {name: ".NETCoreApp,Version=v10.0"},
    targets: {
      ".NETCoreApp,Version=v10.0": {
        "Aspire.Cli/13.6.5": {
          runtime: {"aspire.dll": {}, "Aspire.Common.dll": {}},
          native: {"helper.dll": {}},
          resources: {"fr/Aspire.resources.dll": {locale: "fr"}},
        },
      },
    },
  }),
  [`${toolDir}/Aspire.Common.dll`]: portableExecutable(0x014c),
  [`${toolDir}/helper.dll`]: portableExecutable(),
  [`${toolDir}/fr/Aspire.resources.dll`]: portableExecutable(0x014c),
  [`${toolDir}/bundle/dcp/dcp.exe`]: portableExecutable(),
  [`${toolDir}/bundle/dashboard/Aspire.Dashboard.exe`]: portableExecutable(),
};

function resolverBundle(directory: string): Readonly<Record<string, string | Uint8Array>> {
  return {
    [`${directory}/dcp/dcp.exe`]: portableExecutable(),
    [`${directory}/dcp/dcptun_c`]: "local tunnel stub",
    [`${directory}/managed/aspire-managed.exe`]: portableExecutable(),
    [`${directory}/dashboard/Aspire.Dashboard.exe`]: portableExecutable(),
  };
}

const pinnedCliFiles = {
  ...Object.fromEntries(Object.entries(cliBundleFiles).filter(([path]) => !path.startsWith(`${toolDir}/bundle/`))),
  [`${toolDir}/aspire.dll`]: portableExecutable(0x014c),
};
const payloadFixtures = {
  "pwsh:cli": "verified",
  "pwsh:managed-library": "verified",
  "pwsh:native-library": "verified",
  "pwsh:dcp": "verified",
  "pwsh:managed": "verified",
  "pwsh:dashboard": "verified",
};

function commandLine(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].join(" ");
}

function processKey(request: Readonly<ProcessRequest>, env: Readonly<Record<string, string | undefined>> | undefined): string {
  if (request.command !== "pwsh") return commandLine(request);
  const role = env?.["AROLARIU_PREFLIGHT_PAYLOAD_ROLE"];
  if (role !== undefined) return `pwsh:${role}`;
  if (request.args.at(-1)?.includes("GetFolderPath")) return "pwsh:profile";
  return "pwsh";
}

function fixture(
  variables: Readonly<Record<string, string>> = {},
  overrides: Readonly<Record<string, string>> = {},
  files: Readonly<Record<string, string | Uint8Array>> = {},
  trustedDotnet = false,
  failRestore = false,
) {
  const responses: Readonly<Record<string, string>> = {
    [`git ${gitCheckoutArgs.join(" ")}`]: `${root}\n${commonGitDir}/worktrees/task\n../../repo/.git\n`,
    "git symbolic-ref --quiet HEAD": "refs/heads/chore/task\n",
    "git rev-parse --verify HEAD": `${head}\n`,
    "git worktree list --porcelain -z": registeredWorktree,
    "podman system connection list --format json": JSON.stringify([localMachineContext]),
    "podman machine list --format json": JSON.stringify([{Name: "local-machine", Running: true, Starting: false, ...localMachineSsh}]),
    "podman machine inspect local-machine": JSON.stringify([localMachineInspect]),
    "podman info --format json": `podman-compose version 1.5.0 ${canary}`,
    "dotnet --list-sdks": "10.0.404 [C:/sdk]\n",
    "dotnet --list-runtimes": "Microsoft.NETCore.App 10.0.7 [C:/dotnet/shared]\n",
    "dotnet --version": "10.0.404\n",
    [`dotnet workload restore ${createRepositoryPaths(root).solution}`]: "",
    "dotnet tool restore": "",
    "pwsh:profile": profile,
    "pwsh:swc": "unverified",
    ...overrides,
  };
  const harness = makeTestLayer({
    environment: {
      cwd: root,
      platform: "win32",
      architecture: "x64",
      variables: {APPDATA: "C:/appdata", "ProgramFiles(x86)": "C:/Program Files (x86)", USERPROFILE: profile, ...variables},
    },
    files: {
      "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
      [appHostName]: appHostProject,
      "tooling/Directory.Packages.props":
        '<Project><ItemGroup><PackageVersion Include="Aspire.Hosting.AppHost" Version="13.6.5" /></ItemGroup></Project>',
      "tooling/src/AppHost/Properties/launchSettings.json": JSON.stringify({
        profiles: {
          AppHost: {
            commandName: "Project",
            environmentVariables: {ASPNETCORE_ENVIRONMENT: "Development", DOTNET_ENVIRONMENT: "Development"},
          },
        },
      }),
      "tooling/Directory.Build.props": "<TargetFramework>net10.0</TargetFramework>",
      "C:/podman/wsl/local-machine.json": JSON.stringify({
        Name: "local-machine",
        HostUser: {Rootful: false, UID: 1000},
        SSH: localMachineSsh,
      }),
      "C:/keys/id": canary,
      "C:/repo/.git/worktrees/task/gitdir": "",
      "C:/worktrees/sibling/node_modules/next/package.json": '{"version":"16.4.6"}',
      "C:/worktrees/sibling/sites/exp.arolariu.ro/.venv/Scripts/python.exe": "sibling only",
      ...files,
    },
    processes: [
      scriptedOutcomes((request, options) => {
        const command = commandLine(request);
        if (command === "dotnet dev-certs https --check --trust") {
          if (trustedDotnet) return {kind: "succeeded", exitCode: 0, stdout: "", stderr: canary, durationMs: 0};
          return {kind: "exited", exitCode: 7, stdout: "", stderr: canary, durationMs: 0};
        }
        if (command === forcedRestore || command === guardedRestore) {
          const diagnostic = `synthetic-auth-diagnostic:${canary}`;
          const output = {stdout: diagnostic, stderr: diagnostic, durationMs: 0};
          return failRestore ? {kind: "exited", exitCode: 1, ...output} : {kind: "succeeded", exitCode: 0, ...output};
        }
        const trackedCommand = processKey(request, options.env);
        const payloadPath = options.env?.["AROLARIU_PREFLIGHT_PAYLOAD_PATH"]?.replaceAll("\\", "/");
        const stdout = responses[`${trackedCommand}:${payloadPath}`] ?? responses[trackedCommand];
        if (stdout === undefined) throw new Error("Unapproved process in preflight");
        return {kind: "succeeded", exitCode: 0, stdout, stderr: canary, durationMs: 0};
      }),
    ],
  });
  const before = harness.files();
  return {
    ...harness,
    expectNoTransport: () => expect(harness.httpCalls()).toEqual([]),
    inspect: (expectedRoot?: string) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const readonly = yield* ReadOnlyFiles;
          const forbidSecrets = (path: string): void => {
            expect(path).not.toMatch(/[/\\](?:rootCA-key\.pem|keys[/\\]id)$/iu);
          };
          return yield* inspectWorktreeAspire({engine: "podman", ...(expectedRoot === undefined ? {} : {expectedRoot})}).pipe(
            Effect.provideService(ReadOnlyFiles, {
              ...readonly,
              readFile: (path) => {
                forbidSecrets(path);
                return readonly.readFile(path);
              },
              readFileString: (path) => {
                forbidSecrets(path);
                return readonly.readFileString(path);
              },
              readBytesBounded: (path, max) => {
                forbidSecrets(path);
                return readonly.readBytesBounded(path, max);
              },
              readPrefix: (path) => {
                forbidSecrets(path);
                return readonly.readPrefix(path);
              },
            }),
          );
        }).pipe(Effect.provide(harness.layer)),
      ),
    expectReadOnly: () => {
      expect(harness.files()).toEqual(before);
      expect(harness.httpCalls()).toEqual([]);
      expect(
        harness
          .processCalls()
          .every(
            ({request, options}) =>
              Object.hasOwn(responses, processKey(request, options.env))
              || commandLine(request) === "dotnet dev-certs https --check --trust",
          ),
      ).toBe(true);
    },
  };
}

describe("worktree Aspire preflight", () => {
  it.runIf(process.platform === "win32")("suppresses tracing in actual scoped Git child options, not in other probes", async () => {
    const variables = {
      gIt_TrAcE: "C:/synthetic/trace",
      GIT_TRACE_PACKET: "C:/synthetic/packet",
      GIT_TRACE_FSMONITOR: "C:/synthetic/fsmonitor",
      git_trace2_event: "C:/synthetic/event",
      GIT_TRACE2_PERF: "C:/synthetic/perf",
      GIT_CONFIG_NOSYSTEM: "1",
    };
    const test = fixture(variables);
    const gitOutputs = new Map([
      [gitCheckoutArgs.join(" "), `${root}\n${commonGitDir}/worktrees/task\n../../repo/.git\n`],
      ["symbolic-ref --quiet HEAD", "refs/heads/chore/task\n"],
      ["rev-parse --verify HEAD", `${head}\n`],
      ["worktree list --porcelain -z", registeredWorktree],
    ]);
    const spawned: {readonly args: string; readonly env: ChildProcess.CommandOptions["env"]}[] = [];
    const spawner = Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make((command) =>
        Effect.sync(() => {
          if (command._tag !== "StandardCommand" || command.command !== "git") throw new Error("Unexpected child");
          const args = command.args.join(" ");
          const stdout = gitOutputs.get(args);
          if (stdout === undefined) throw new Error("Unexpected Git probe");
          spawned.push({args, env: command.options.env});
          expect(command.options.extendEnv).toBe(false);
          return ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            stdin: Sink.drain,
            stdout: Stream.make(new TextEncoder().encode(stdout)),
            stderr: Stream.empty,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
            unref: Effect.succeed(Effect.void),
          });
        }),
      ),
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const scripted = yield* Process;
        const live = yield* Effect.gen(function* () {
          return yield* Process;
        }).pipe(Effect.provide(ProcessLive), Effect.provide(spawner));
        yield* Effect.gen(function* () {
          const preflight = yield* inspectWorktreeAspire({engine: "podman"});
          expect(preflight.checkout?.head).toBe(head);
          const platform = yield* localWorktreePlatform();
          expect((yield* platform.checkout)?.head).toBe(head);
          yield* inspectionProbeRunner.run(probes.workspace.gitBranch(), {cwd: root});
        }).pipe(
          Effect.provideService(Process, {
            run: (request, options) => (request.command === "git" ? live : scripted).run(request, options),
          }),
        );
      }).pipe(Effect.provide(test.layer)),
    );
    const scoped = spawned.slice(0, -1);
    expect(scoped.map(({args}) => args)).toEqual([...gitOutputs.keys(), ...gitOutputs.keys()]);
    for (const {env} of scoped) {
      expect(Object.fromEntries(Object.entries(env ?? {}).filter(([key]) => /^git_trace/iu.test(key)))).toEqual({
        GIT_TRACE2: "0",
        GIT_TRACE2_EVENT: "0",
        GIT_TRACE2_PERF: "0",
      });
      expect(env?.["GIT_CONFIG_NOSYSTEM"]).toBe("1");
    }
    expect(spawned.at(-1)?.env).toMatchObject(variables);
    test.expectReadOnly();
  });

  it
    .runIf(process.platform === "win32")
    .each([
      "Directory.Build.rsp",
      "tooling/src/AppHost/Directory.Build.rsp",
      "C:/worktrees/Directory.Build.rsp",
      "C:/sdk/10.0.404/MSBuild.rsp",
    ])("rejects automatic response-file evidence at %s before restore and on read", async (responseFile) => {
    const test = fixture({}, {}, restoreFiles);
    const paths = createRepositoryPaths(root);
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        expect(yield* recordWorktreeRestoreEvidence(paths, Effect.void)).toBe(true);
        expect(yield* currentWorktreeRestoreEvidence(paths)).toMatch(/^[a-f0-9]{64}$/u);
        const receipt = yield* fs.readFileString(receiptPath);
        yield* fs.writeFileString(responseFile, "# inert synthetic response-file marker");
        const before = test.files();
        expect.soft(yield* currentWorktreeRestoreEvidence(paths)).toBeUndefined();
        let ran = false;
        const refreshed = yield* recordWorktreeRestoreEvidence(
          paths,
          Effect.sync(() => {
            ran = true;
          }),
        );
        expect.soft(refreshed).toBe(false);
        expect.soft(ran).toBe(false);
        expect(test.files()).toEqual(before);
        expect(yield* fs.readFileString(receiptPath)).toBe(receipt);
      }).pipe(Effect.provide(test.layer)),
    );
    test.expectNoTransport();
  });

  it.runIf(process.platform === "win32")("rejects the older receipt version without response-file policy", async () => {
    const test = fixture({}, {}, restoreFiles);
    const paths = createRepositoryPaths(root);
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        expect(yield* recordWorktreeRestoreEvidence(paths, Effect.void)).toBe(true);
        const receipt = JSON.parse(yield* fs.readFileString(receiptPath)) as Record<string, unknown>;
        yield* fs.writeFileString(receiptPath, `${JSON.stringify({...receipt, version: 1})}\n`);
        const before = test.files();
        expect(yield* currentWorktreeRestoreEvidence(paths)).toBeUndefined();
        expect(test.files()).toEqual(before);
      }).pipe(Effect.provide(test.layer)),
    );
  });

  it.runIf(process.platform === "win32").each([
    {label: "ambiguous SDK inventory", listing: "10.0.404 [C:/sdk]\n10.0.404 [C:/other-sdk]\n", globalJson: "{}"},
    {label: "unobservable selected SDK directory", listing: "10.0.404 [C:/other-sdk]\n", globalJson: "{}"},
    {label: "SDK search-path override", listing: "10.0.404 [C:/sdk]\n", globalJson: '{"sdk":{"paths":[".dotnet"]}}'},
  ])("blocks $label before the synthetic restore", async ({listing, globalJson}) => {
    const test = fixture({}, {"dotnet --list-sdks": listing}, {...restoreFiles, "global.json": globalJson});
    const recorded = await Effect.runPromise(
      recordWorktreeRestoreEvidence(createRepositoryPaths(root), Effect.die("unsupported SDK evidence reached restore")).pipe(
        Effect.provide(test.layer),
      ),
    );
    expect(recorded).toBe(false);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("invalidates a receipt if a response file appears during the synthetic refresh", async () => {
    const test = fixture({}, {}, restoreFiles);
    const paths = createRepositoryPaths(root);
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        expect(yield* recordWorktreeRestoreEvidence(paths, Effect.void)).toBe(true);
        expect(yield* recordWorktreeRestoreEvidence(paths, fs.writeFileString("Directory.Build.rsp", "# inert synthetic marker"))).toBe(
          false,
        );
        expect(yield* currentWorktreeRestoreEvidence(paths)).toBeUndefined();
      }).pipe(Effect.provide(test.layer)),
    );
    expect([...test.files().keys()].some((path) => path.endsWith(receiptPath) || path.endsWith(lockPath))).toBe(false);
    test.expectNoTransport();
  });

  it.runIf(process.platform === "win32")("pins the local machine registration without a backend request", async () => {
    const observe = async (created: string, variables: Readonly<Record<string, string>> = {}) => {
      const test = fixture(variables, {
        "podman machine inspect local-machine": JSON.stringify([{...localMachineInspect, Created: created}]),
      });
      const engine = await Effect.runPromise(
        Effect.gen(function* () {
          const checkout = yield* observeWorktreeCheckout();
          expect(checkout).toBeDefined();
          return checkout && (yield* observeWorktreeEngine(checkout));
        }).pipe(Effect.provide(test.layer)),
      );
      expect(test.processCalls().some(({request}) => commandLine(request).startsWith("podman info"))).toBe(false);
      return engine;
    };
    const first = await observe("2026-11-25T10:20:30.123456789Z");
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(await observe("2026-11-25T10:20:30.123456789Z")).toBe(first);
    expect(await observe("2026-11-25T10:20:30.123456790Z")).not.toBe(first);
    expect(await observe("")).toBeUndefined();
    expect(await observe("2026-11-25T10:20:30.123456789Z", {CONTAINER_HOST: canary})).toBeUndefined();
  });

  it
    .runIf(process.platform === "win32")
    .each(["_DirectoryBuildTargetsFile", "_DirectoryBuildTargetsBasePath", "_DirectoryBuildPropsFile", "_DirectoryBuildPropsBasePath"])(
    "does not reuse an otherwise matching restore receipt with ambient %s",
    async (key) => {
      const test = fixture({}, {}, restoreFiles);
      const paths = createRepositoryPaths(root);
      await Effect.runPromise(
        Effect.gen(function* () {
          const env = yield* Environment;
          const fs = yield* FileSystem.FileSystem;
          expect(yield* recordWorktreeRestoreEvidence(paths, Effect.void)).toBe(true);
          expect(yield* currentWorktreeRestoreEvidence(paths)).toMatch(/^[a-f0-9]{64}$/u);
          const before = yield* fs.readFileString(receiptPath);
          const withSelector = Effect.provideService(Environment, {...env, variables: {...env.variables, [key]: "C:/synthetic/alternate"}});
          expect(yield* currentWorktreeRestoreEvidence(paths).pipe(withSelector)).toBeUndefined();
          expect(yield* recordWorktreeRestoreEvidence(paths, Effect.die("unsupported selector reached restore")).pipe(withSelector)).toBe(
            false,
          );
          expect(yield* fs.readFileString(receiptPath)).toBe(before);
        }).pipe(Effect.provide(test.layer)),
      );
      test.expectNoTransport();
    },
  );

  it
    .runIf(process.platform === "win32")
    .each([
      "project",
      "central",
      "graph",
      "generated targets",
      "source mapping",
      "cache config",
      "new config",
      "foreign",
      "malformed",
      "locked",
    ] as const)("rejects real producer evidence after %s changes", async (change) => {
    const paths = createRepositoryPaths(root);
    const test = fixture({}, {}, restoreFiles);
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        expect(yield* recordWorktreeRestoreEvidence(paths, Effect.void)).toBe(true);
        expect(yield* currentWorktreeRestoreEvidence(paths)).toMatch(/^[a-f0-9]{64}$/u);
        const receipt = JSON.parse(yield* fs.readFileString(receiptPath)) as Record<string, unknown>;
        expect(Object.keys(receipt).sort()).toEqual(["checkout", "graph", "inputs", "version"]);
        expect(receipt["inputs"]).toMatch(/^[a-f0-9]{64}$/u);
        if (change === "source mapping") yield* fs.writeFileString(userConfig, configFiles[userConfig].replace("Example.*", "Other.*"));
        if (change === "cache config") yield* fs.writeFileString(machineConfig, configFiles[machineConfig].replace("C:/nuget", "C:/other"));
        if (change === "new config") yield* fs.writeFileString("C:/Program Files (x86)/NuGet/Config/New.config", "<configuration/>");
        if (change === "project") yield* fs.writeFileString(appHostName, "<Project />");
        if (change === "central")
          yield* fs.writeFileString("tooling/Directory.Packages.props", "<Project><PropertyGroup><X>2</X></PropertyGroup></Project>");
        if (change === "graph") yield* fs.writeFileString(graphPath, `${restoreFiles[graphPath]}\n`);
        if (change === "generated targets")
          yield* fs.writeFileString("tooling/src/AppHost/obj/AppHost.csproj.nuget.g.targets", "<Project><!-- changed --></Project>");
        if (change === "foreign") {
          const receipt = yield* fs.readFileString(receiptPath);
          yield* fs.writeFileString(receiptPath, receipt.replace("worktrees", "unrelated"));
        }
        if (change === "malformed") yield* fs.writeFileString(receiptPath, "{");
        if (change === "locked") yield* fs.writeFileString("tooling/src/AppHost/obj/.worktree-restore-evidence.lock", "");
        return yield* currentWorktreeRestoreEvidence(paths);
      }).pipe(Effect.provide(test.layer)),
    );
    expect(result).toBeUndefined();
    test.expectNoTransport();
  });

  it
    .runIf(process.platform === "win32")
    .each(["changed bytes", "changed list", "missing listed file", "unlisted current file", "malformed graph"] as const)(
    "does not publish restore evidence with %s",
    async (change) => {
      const test = fixture({}, {}, restoreFiles);
      let ran = false;
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          if (change === "missing listed file") yield* fs.remove(machineConfig);
          if (change === "unlisted current file")
            yield* fs.writeFileString("C:/Program Files (x86)/NuGet/Config/New.config", "<configuration/>");
          if (change === "malformed graph") yield* fs.writeFileString(graphPath, "{");
          return yield* recordWorktreeRestoreEvidence(
            createRepositoryPaths(root),
            Effect.gen(function* () {
              ran = true;
              if (change === "changed bytes") yield* fs.writeFileString(machineConfig, "<configuration/>");
              if (change === "changed list")
                yield* fs.writeFileString(graphPath, restoreFiles[graphPath].replace(machineConfig, "C:/other.config"));
            }),
          );
        }).pipe(Effect.provide(test.layer)),
      );
      expect(ran).toBe(change === "changed bytes" || change === "changed list");
      expect(result).not.toBe(true);
      expect([...test.files().keys()].some((path) => path.endsWith(receiptPath))).toBe(false);
    },
  );

  it.runIf(process.platform === "win32").each(["raced", "failed"] as const)("does not publish a receipt after %s restore", async (kind) => {
    const test = fixture({}, {}, restoreFiles);
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        expect(yield* recordWorktreeRestoreEvidence(createRepositoryPaths(root), Effect.void)).toBe(true);
        return yield* Effect.exit(
          recordWorktreeRestoreEvidence(
            createRepositoryPaths(root),
            kind === "raced"
              ? fs.writeFileString(appHostName, "<Project />").pipe(Effect.mapError(() => "scripted write failure"))
              : Effect.fail("scripted failure"),
          ),
        );
      }).pipe(Effect.provide(test.layer)),
    );
    expect(result._tag === "Failure" || (result._tag === "Success" && result.value === false)).toBe(true);
    expect([...test.files().keys()].some((path) => path.endsWith("worktree-restore-evidence.json"))).toBe(false);
  });
  it.runIf(process.platform === "win32").each(["DcpCliPath", "DcpExtensionsDir"] as const)(
    "rejects %s before inspecting a different DCP payload",
    async (key) => {
      const test = fixture({NUGET_PACKAGES: cache, [key]: "C:/external/dcp"}, payloadFixtures, {
        ...pinnedCliFiles,
        ...resolverBundle(`${aspireHome}/bundle`),
      });
      expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
      expect(test.processCalls().some(({options}) => options.env?.["AROLARIU_PREFLIGHT_PAYLOAD_ROLE"] === "dcp")).toBe(false);
    },
  );

  it.runIf(process.platform === "win32").each([
    ["tooling/Directory.Build.targets", "DcpCliPath", "utf8"],
    ["tooling/src/AppHost/Directory.Build.targets", "DcpExtensionsDir", "utf8"],
    ["Directory.Build.targets", "DcpCliPath", "utf8"],
    ["tooling/src/Directory.Build.targets", "DcpExtensionsDir", "utf16le"],
  ] as const)("blocks a DCP selector in %s before any payload probe", async (path, key, encoding) => {
    const xml = `<Project><PropertyGroup><${key}>C:/external/dcp</${key}></PropertyGroup></Project>`;
    const test = fixture({NUGET_PACKAGES: cache}, payloadFixtures, {
      ...restoreFiles,
      ...pinnedCliFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
      [path]: encoding === "utf16le" ? Buffer.from(`\ufeff${xml}`, encoding) : xml,
    });
    const record = recordWorktreeRestoreEvidence(
      createRepositoryPaths(root),
      Effect.die("unsupported build selectors must not reach restore"),
    );
    expect(await Effect.runPromise(record.pipe(Effect.provide(test.layer)))).toBe(false);
    expect(test.processCalls()).toEqual([]);
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    expect(test.processCalls().some(({options}) => options.env?.["AROLARIU_PREFLIGHT_PAYLOAD_ROLE"] !== undefined)).toBe(false);
  });

  it.runIf(process.platform === "win32").each([
    [appHostName, "DirectoryBuildTargetsPath", appHostProject],
    ["tooling/Directory.Build.props", "DirectoryBuildTargetsPath", "<Project><TargetFramework>net10.0</TargetFramework></Project>"],
    [
      "tooling/Directory.Packages.props",
      "DirectoryBuildPropsPath",
      '<Project><ItemGroup><PackageVersion Include="Aspire.Hosting.AppHost" Version="13.6.5" /></ItemGroup></Project>',
    ],
    ["tooling/src/Directory.Build.targets", "dIrEcToRyBuIlDpRoPsPaTh", "<Project></Project>"],
    ["ambient", "DirectoryBuildTargetsPath", ""],
    ["ambient", "DirectoryBuildPropsPath", ""],
    [appHostName, "_DirectoryBuildTargetsFile", appHostProject],
    ["tooling/Directory.Build.props", "_DirectoryBuildTargetsBasePath", "<Project></Project>"],
    ["tooling/Directory.Packages.props", "_DirectoryBuildPropsFile", "<Project></Project>"],
    ["tooling/src/Directory.Build.targets", "_dIrEcToRyBuIlDpRoPsBaSePaTh", "<Project></Project>"],
    ["ambient", "_DirectoryBuildTargetsFile", ""],
    ["ambient", "_DirectoryBuildTargetsBasePath", ""],
    ["ambient", "_DirectoryBuildPropsFile", ""],
    ["ambient", "_DirectoryBuildPropsBasePath", ""],
    ["ambient", "CustomBeforeDirectoryBuildProps", ""],
    ["ambient", "CustomAfterDirectoryBuildProps", ""],
    ["ambient", "CustomBeforeDirectoryBuildTargets", ""],
    ["ambient", "CustomAfterDirectoryBuildTargets", ""],
    [appHostName, "CustomBeforeDirectoryBuildProps", appHostProject],
    ["tooling/Directory.Build.props", "CustomAfterDirectoryBuildProps", "<Project><TargetFramework>net10.0</TargetFramework></Project>"],
    ["tooling/src/Directory.Build.targets", "CustomBeforeDirectoryBuildTargets", "<Project></Project>"],
    ["tooling/src/Directory.Build.targets", "cUsToMaFtErDiReCtOrYbUiLdTaRgEtS", "<Project></Project>"],
  ] as const)("blocks unmodeled build-file selectors in %s (%s) before probing or refreshing", async (path, key, xml) => {
    const alternate = "C:/synthetic/alternate.build.xml";
    const property = `<PropertyGroup><${key}>${alternate}</${key}></PropertyGroup>`;
    const test = fixture({NUGET_PACKAGES: cache, ...(path === "ambient" ? {[key]: alternate} : {})}, payloadFixtures, {
      ...restoreFiles,
      ...pinnedCliFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
      ...(path === "ambient" ? {} : {[path]: xml.replace("</Project>", `${property}</Project>`)}),
    });
    const observed = await test.inspect();
    test.expectReadOnly();
    const recorded = await Effect.runPromise(
      recordWorktreeRestoreEvidence(
        createRepositoryPaths(root),
        Effect.flatMap(Process, (process) => process.run(forcedRestoreRequest)),
      ).pipe(Effect.provide(test.layer)),
    );
    expect.soft(observed.capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    expect.soft(test.processCalls().some(({options}) => options.env?.["AROLARIU_PREFLIGHT_PAYLOAD_ROLE"] !== undefined)).toBe(false);
    expect.soft(recorded).toBe(false);
    expect.soft(test.processCalls().some(({request}) => commandLine(request) === forcedRestore)).toBe(false);
    expect(test.files().keys()).not.toContain(`${root}/${receiptPath}`);
    test.expectNoTransport();
  });

  it.runIf(process.platform === "win32").each([
    ["percent variable", "%SYNTHETIC_CACHE%"],
    ["XML character references", "&#x25;SYNTHETIC_CACHE&#37;"],
    ["unsupported encoding", Buffer.from('\ufeff<?xml version="1.0" encoding="utf-16"?><configuration/>', "utf16le")],
  ] as const)("does not run the scripted refresh for NuGet %s", async (_label, value) => {
    const config = typeof value === "string" ? configFiles[machineConfig].replace("C:/nuget", value) : value;
    const test = fixture({SYNTHETIC_CACHE: canary}, {}, {...restoreFiles, [machineConfig]: config});
    const paths = createRepositoryPaths(root);
    const recorded = await Effect.runPromise(
      recordWorktreeRestoreEvidence(
        paths,
        Effect.flatMap(Process, (process) => process.run(forcedRestoreRequest)),
      ).pipe(Effect.provide(test.layer)),
    );
    expect.soft(recorded).toBe(false);
    expect.soft(test.processCalls()).toEqual([]);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32").each([
    ["non-PE runtime", "Aspire.Common.dll", "invalid payload", {}],
    [
      "wrong-role runtime",
      "Aspire.Common.dll",
      portableExecutable(),
      {[`pwsh:managed-library:${toolDir}/Aspire.Common.dll`]: "unverified"},
    ],
    ["wrong-role native", "helper.dll", portableExecutable(), {[`pwsh:native-library:${toolDir}/helper.dll`]: "unverified"}],
    [
      "wrong-role resource",
      "fr/Aspire.resources.dll",
      portableExecutable(),
      {[`pwsh:managed-library:${toolDir}/fr/Aspire.resources.dll`]: "unverified"},
    ],
  ] as const)("blocks a declared %s companion", async (_label, file, contents, overrides) => {
    const test = fixture(
      {NUGET_PACKAGES: cache},
      {...payloadFixtures, ...overrides},
      {
        ...pinnedCliFiles,
        ...resolverBundle(`${aspireHome}/bundle`),
        [`${toolDir}/${file}`]: contents,
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
  });

  it.runIf(process.platform === "win32")("blocks an Aspire tool cache lacking a declared runtime companion", async () => {
    const test = fixture({NUGET_PACKAGES: cache}, payloadFixtures, {
      ...pinnedCliFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
      [`${toolDir}/aspire.deps.json`]: JSON.stringify({
        runtimeTarget: {name: ".NETCoreApp,Version=v10.0"},
        targets: {".NETCoreApp,Version=v10.0": {"Aspire.Cli/13.6.5": {runtime: {"aspire.dll": {}, "Missing.dll": {}}}}},
      }),
    });
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
  });

  it.runIf(process.platform === "win32")("blocks an Aspire runtimeconfig pointing at the wrong shared framework", async () => {
    const test = fixture({NUGET_PACKAGES: cache}, payloadFixtures, {
      ...pinnedCliFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
      [`${toolDir}/aspire.runtimeconfig.json`]:
        '{"runtimeOptions":{"tfm":"net10.0","framework":{"name":"Microsoft.WindowsDesktop.App","version":"10.0.0"}}}',
    });
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
  });

  it.runIf(process.platform === "win32")("blocks a managed CLI whose requested framework patch is not installed", async () => {
    const test = fixture(
      {NUGET_PACKAGES: cache},
      {...payloadFixtures, "dotnet --list-runtimes": "Microsoft.NETCore.App 9.0.7 [C:/dotnet/shared]"},
      {
        ...pinnedCliFiles,
        ...resolverBundle(`${aspireHome}/bundle`),
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
  });

  it.runIf(process.platform === "win32").each([
    ["default home", {}, `${aspireHome}/bundle`],
    ["versioned home", {}, `${aspireHome}/versions/13.6.5_0123456789abcdef`],
    ["explicit Aspire home", {ASPIRE_HOME: "C:/approved-aspire"}, "C:/approved-aspire/bundle"],
    ["explicit resolver layout", {AspireCliBundlePath: "C:/approved-layout"}, "C:/approved-layout"],
  ] as const)("checks the pinned DNX bundle from the %s", async (_label, variables, directory) => {
    const test = fixture(
      {NUGET_PACKAGES: cache, ...variables},
      {...payloadFixtures, "pwsh:profile": profile},
      {...pinnedCliFiles, ...resolverBundle(directory)},
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "pass"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("rejects a payload found only beside the NuGet tool, outside resolver selection", async () => {
    const test = fixture({NUGET_PACKAGES: cache}, {...payloadFixtures, "pwsh:profile": profile}, {...cliBundleFiles, ...pinnedCliFiles});
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("does not substitute a complete home bundle for an incomplete explicit selection", async () => {
    const directory = `${toolDir}/bundle`;
    const test = fixture(
      {NUGET_PACKAGES: cache, AspireCliBundlePath: directory},
      {...payloadFixtures, "pwsh:profile": profile},
      {
        ...pinnedCliFiles,
        ...resolverBundle(`${aspireHome}/bundle`),
        ...cliBundleFiles,
      },
    );

    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("blocks an unmodeled Aspire override instead of falling back to the default home", async () => {
    const test = fixture({NUGET_PACKAGES: cache, DcpDir: "C:/other-dcp"}, payloadFixtures, {
      ...pinnedCliFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
    });
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    expect(test.processCalls().some(({options}) => options.env?.["AROLARIU_PREFLIGHT_PAYLOAD_ROLE"] === "dcp")).toBe(false);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32").each([
    ["project", {[appHostName]: '<Project><ItemGroup><PackageReference Include="Example.Sdk" Version="9.0.0" /></ItemGroup></Project>'}],
    [
      "central pin",
      {
        "tooling/Directory.Packages.props":
          '<Project><ItemGroup><PackageVersion Include="Example.Sdk" Version="9.0.0" /></ItemGroup></Project>',
      },
    ],
  ] as const)("does not accept an unbound restore graph after a %s change", async (_label, inputs) => {
    const test = fixture({}, {}, {...restoreFiles, [`${packageDir}/${assetFile}`]: portableExecutable(), ...inputs});
    expect((await test.inspect()).capabilities).toContainEqual(
      expect.objectContaining({id: "nuget-assets", status: "blocked", detail: expect.stringContaining("freshness")}),
    );
    test.expectReadOnly();
  });

  it("rejects a generic native PE masquerading as the pinned SWC package payload", async () => {
    const test = fixture(
      {},
      {},
      {...nextFiles, "node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node": portableExecutable()},
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "npm-dependencies", status: "blocked"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32").each(["cli", "dcp"] as const)(
    "rejects an unverified %s role despite well-shaped PE files",
    async (role) => {
      const directory = `${toolDir}/bundle`;
      const test = fixture(
        {NUGET_PACKAGES: cache, AspireCliBundlePath: directory},
        {...payloadFixtures, [`pwsh:${role}`]: "unverified"},
        {
          ...pinnedCliFiles,
          ...resolverBundle(directory),
        },
      );
      expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
      test.expectReadOnly();
    },
  );

  it.runIf(process.platform === "win32").each([null, false, {}])(
    "blocks a required exp endpoint of an incompatible type (%#)",
    async (endpoint) => {
      const test = fixture(
        {},
        {},
        {
          [`${exp}/config.template.json`]: '{"Endpoints:Database:SQL":"","Auth:Clerk:SecretKey":""}',
          [`${exp}/config.docker.json`]: JSON.stringify({"Endpoints:Database:SQL": endpoint, "Auth:Clerk:SecretKey": canary}),
        },
      );
      const result = await test.inspect();
      expect(result.capabilities).toContainEqual(expect.objectContaining({id: "exp-config", status: "blocked"}));
      expect(JSON.stringify(result)).not.toContain(canary);
      test.expectReadOnly();
    },
  );

  it.runIf(process.platform === "win32")("does not block required website keys because of an unrelated Windows path", async () => {
    const test = fixture(
      {},
      {},
      {
        "sites/arolariu.ro/.env": `${siteEnv}\nTOOL_PATH=C:\\SDK\\tools`,
        "sites/arolariu.ro/.env.local": 'BANNER="C:\\SDK\\tools\nCLERK_SECRET_KEY=\n"',
      },
    );
    const result = await test.inspect();
    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "website-config", status: "pass"}));
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it.each([
    ["unregistered", registeredWorktree.replace(root, "C:/worktrees/another")],
    ["wrong branch", registeredWorktree.replace("refs/heads/chore/task", "refs/heads/another")],
    ["wrong HEAD", registeredWorktree.replace(head, "0".repeat(40))],
    ["duplicate registration", registeredWorktree.repeat(2)],
  ])("rejects %s Git worktree metadata before preparation probes", async (_label, listing) => {
    const test = fixture({}, {"git worktree list --porcelain -z": listing});
    expect(await test.inspect()).toMatchObject({status: "blocked", checkout: null});
    expect(test.processCalls().every(({request}) => request.command === "git")).toBe(true);
    test.expectReadOnly();
  });

  it.each([
    ["port", {...localMachineContext, URI: localMachineContext.URI.replace("52000", "52001")}],
    ["guest socket", {...localMachineContext, URI: localMachineContext.URI.replace("1000", "1001")}],
    ["identity", {...localMachineContext, Identity: "C:/keys/elsewhere"}],
    ["name", {...localMachineContext, Name: "unknown-machine"}],
  ])("does not contact a loopback connection with an unregistered %s", async (_label, connection) => {
    const test = fixture(
      {},
      {
        "podman system connection list --format json": JSON.stringify([connection]),
        "podman info --format json": trustedBackend,
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "podman-backend", status: "blocked"}));
    expect(test.processCalls().map(({request}) => commandLine(request))).not.toContain("podman info --format json");
    test.expectReadOnly();
  });

  it("does not contact a loopback connection with ambiguous machine registrations", async () => {
    const registration = {Name: "local-machine", Running: true, Starting: false, ...localMachineSsh};
    const test = fixture(
      {},
      {
        "podman machine list --format json": JSON.stringify([registration, registration]),
        "podman info --format json": trustedBackend,
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "podman-backend", status: "blocked"}));
    expect(test.processCalls().map(({request}) => commandLine(request))).not.toContain("podman info --format json");
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("accepts the real exp PEP 440 pin shape using installed normalized metadata", async () => {
    const test = fixture(
      {},
      {},
      {
        [`${exp}/requirements.txt`]: "opentelemetry-instrumentation-fastapi==0.66b2\nopentelemetry-exporter-otlp-proto-http~=1.45.2",
        [`${venv}/pyvenv.cfg`]: "include-system-site-packages=false",
        [`${venv}/Scripts/python.exe`]: "stub",
        [`${venv}/Lib/site-packages/opentelemetry_instrumentation_fastapi-0.66.0b2.dist-info/METADATA`]: "stub",
        [`${venv}/Lib/site-packages/opentelemetry_exporter_otlp_proto_http-1.45.3.dist-info/METADATA`]: "stub",
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "python-dependencies", status: "pass"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("observes keys from the same user secrets and website .env written by Setup", async () => {
    const test = fixture(
      {APPDATA: "C:/appdata"},
      {},
      {
        [secretPath]: JSON.stringify({"Parameters:sql-password": canary, "Parameters:redis-password": canary}),
        "sites/arolariu.ro/.env": siteEnv,
        "sites/arolariu.ro/.env.local": "",
      },
    );

    const result = await test.inspect();
    for (const id of ["apphost-config", "website-config"])
      expect(result.capabilities).toContainEqual(expect.objectContaining({id, status: "pass"}));
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")(
    "does not claim Development secrets for a launch profile that redirects configuration",
    async () => {
      const test = fixture(
        {APPDATA: "C:/appdata"},
        {},
        {
          [secretPath]: JSON.stringify({"Parameters:sql-password": canary, "Parameters:redis-password": canary}),
          "tooling/src/AppHost/Properties/launchSettings.json": JSON.stringify({
            profiles: {
              AppHost: {
                commandName: "Project",
                workingDirectory: "C:/another-worktree",
                environmentVariables: {ASPNETCORE_ENVIRONMENT: "Development", DOTNET_ENVIRONMENT: "Development"},
              },
            },
          }),
        },
      );
      const result = await test.inspect();
      expect(result.capabilities).toContainEqual(expect.objectContaining({id: "apphost-config", status: "blocked"}));
      expect(JSON.stringify(result)).not.toContain(canary);
      test.expectReadOnly();
    },
  );

  it.runIf(process.platform === "win32")("blocks ambiguous AppHost user-secret keys without leaking either value", async () => {
    const test = fixture(
      {APPDATA: "C:/appdata"},
      {},
      {
        [secretPath]: `{"Parameters:sql-password":"${canary}","Parameters:SQL-password":"${canary}","Parameters:redis-password":"${canary}"}`,
      },
    );
    const result = await test.inspect();
    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "apphost-config", status: "blocked"}));
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("does not substitute lower-precedence config for explicit empty launch settings", async () => {
    const test = fixture(
      {
        APPDATA: "C:/appdata",
        "Parameters__sql-password": "",
        "Parameters__redis-password": canary,
        SITE_ENV: canary,
        SITE_NAME: canary,
        SITE_URL: canary,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: canary,
        CLERK_SECRET_KEY: "",
      },
      {},
      {
        [secretPath]: JSON.stringify({"Parameters:sql-password": canary, "Parameters:redis-password": canary}),
        "sites/arolariu.ro/.env": siteEnv,
      },
    );
    const result = await test.inspect();
    for (const id of ["apphost-config", "website-config"])
      expect(result.capabilities).toContainEqual(expect.objectContaining({id, status: "blocked"}));
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("blocks trivial restore JSON and a marker-only Aspire CLI bundle", async () => {
    const test = fixture(
      {NUGET_PACKAGES: cache},
      {},
      {
        "arolariu.slnx": `<Solution><Project Path="${appHostName}" /></Solution>`,
        "tooling/src/AppHost/obj/project.assets.json": "{}",
        [`${cache}/aspire.apphost.sdk/13.6.5/Sdk/Sdk.targets`]: "<Project />",
        [`${tool}/aspire.cli.nuspec`]: "marker",
        [`${toolDir}/DotnetToolSettings.xml`]: "marker",
        [`${toolDir}/bundle/dcp/dcp.exe`]: "marker",
        [`${toolDir}/bundle/dashboard/Aspire.Dashboard.exe`]: "marker",
      },
    );
    const result = await test.inspect();
    for (const id of ["nuget-assets", "aspire-bundle"])
      expect(result.capabilities).toContainEqual(expect.objectContaining({id, status: "blocked"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")("does not mistake restore metadata and CLI settings for the referenced payloads", async () => {
    const test = fixture({NUGET_PACKAGES: cache}, payloadFixtures, {
      ...restoreFiles,
      ...cliBundleFiles,
      ...resolverBundle(`${aspireHome}/bundle`),
    });
    const result = await test.inspect();
    expect(result.capabilities).toContainEqual(
      expect.objectContaining({
        id: "nuget-assets",
        status: "blocked",
        detail: expect.stringContaining("artifacts could not be verified"),
      }),
    );
    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "aspire-bundle", status: "blocked"}));
    test.expectReadOnly();
  });

  it("does not count the applicable SWC package marker without its native binding", async () => {
    const test = fixture({}, {}, nextFiles);
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "npm-dependencies", status: "blocked"}));
    test.expectReadOnly();
  });

  it("rejects a wrong-architecture SWC binary even when the pinned package marker matches", async () => {
    const test = fixture(
      {},
      {"pwsh:swc": "verified"},
      {...nextFiles, "node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node": portableExecutable(0xaa64)},
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "npm-dependencies", status: "blocked"}));
    test.expectReadOnly();
  });

  it("accepts the exact installed Next fallback layout without running a download or a binding", async () => {
    const installed = "node_modules/@next/swc-win32-x64-msvc/package.json";
    const {[installed]: manifest, ...files} = nextFiles;
    const location = "node_modules/next/next-swc-fallback/@next/swc-win32-x64-msvc";
    const test = fixture(
      {},
      {"pwsh:swc": "verified"},
      {
        ...files,
        [`${location}/package.json`]: manifest,
        [`${location}/next-swc.win32-x64-msvc.node`]: portableExecutable(),
      },
    );
    expect((await test.inspect()).capabilities).toContainEqual(expect.objectContaining({id: "npm-dependencies", status: "pass"}));
    test.expectReadOnly();
  });

  it.runIf(process.platform === "win32")(
    "uses the higher-priority development .env override rather than a lower file with nonblank keys",
    async () => {
      const test = fixture(
        {},
        {},
        {
          "sites/arolariu.ro/.env": siteEnv,
          "sites/arolariu.ro/.env.development.local": "CLERK_SECRET_KEY= # intentionally empty",
        },
      );
      const result = await test.inspect();
      expect(result.capabilities).toContainEqual(
        expect.objectContaining({id: "website-config", status: "blocked", detail: expect.stringContaining("CLERK_SECRET_KEY")}),
      );
      expect(JSON.stringify(result)).not.toContain(canary);
      test.expectReadOnly();
    },
  );

  it.runIf(process.platform === "win32").each(["[]", `{"Auth:Clerk:SecretKey":"${canary}"}`, `{"${canary}":`])(
    "blocks invalid or incomplete exp configuration without parser excerpts (case %#)",
    async (contents) => {
      const test = fixture(
        {},
        {},
        {
          [`${exp}/config.template.json`]: '{"Auth:Clerk:SecretKey":"","Site:Url":""}',
          [`${exp}/config.docker.json`]: contents,
        },
      );
      const result = await test.inspect();
      expect(result.capabilities).toContainEqual(expect.objectContaining({id: "exp-config", status: "blocked"}));
      expect(JSON.stringify(result)).not.toContain(canary);
      test.expectReadOnly();
    },
  );

  it("rejects a checkout mismatch without preparation", async () => {
    const test = fixture();

    const result = await test.inspect("C:/repo");

    expect(result).toMatchObject({status: "blocked", checkout: null, capabilities: [{id: "checkout", status: "blocked"}]});
    expect(test.processCalls()).toEqual([]);
    test.expectReadOnly();
  });

  it("reports missing SQL/config and untrusted TLS by key only", async () => {
    const test = fixture({CLERK_SECRET_KEY: canary});

    const result = await test.inspect();

    expect(result.status).toBe("blocked");
    const detail = Object.fromEntries(result.capabilities.map((capability) => [capability.id, capability.detail]));
    expect(detail["apphost-config"]).toContain("Parameters:sql-password");
    expect(detail["website-config"]).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(detail["website-config"]).not.toContain("CLERK_SECRET_KEY");
    expect(detail["exp-config"]).toContain("config.docker.json");
    expect(detail["dotnet-tls"]).toContain("dotnet.certificate.trust");
    expect(detail["dotnet-tls"]).toContain("exit 7");
    expect(JSON.stringify(result)).not.toContain(canary);
    for (const {options} of test.processCalls()) {
      expect(Object.hasOwn(options.env ?? {}, "CLERK_SECRET_KEY")).toBe(true);
      expect(options.env?.["CLERK_SECRET_KEY"]).toBeUndefined();
      expect(JSON.stringify(options)).not.toContain(canary);
    }
    test.expectReadOnly();
  });

  it("does not classify a provider version banner as a responsive engine", async () => {
    const test = fixture();

    const result = await test.inspect();

    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "podman-backend", status: "blocked"}));
    expect(test.processCalls().map(({request}) => commandLine(request))).toContain("podman info --format json");
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it("reports offline cache misses without silently using a sibling environment", async () => {
    const test = fixture({VIRTUAL_ENV: "C:/worktrees/sibling/sites/exp.arolariu.ro/.venv", NODE_PATH: "C:/worktrees/sibling/node_modules"});

    const result = await test.inspect(root);

    expect(result.checkout).toMatchObject({branch: "chore/task", head});
    for (const id of ["npm-dependencies", "python-dependencies", "aspire-bundle"]) {
      expect(result.capabilities).toContainEqual(expect.objectContaining({id, status: "blocked"}));
    }
    expect(JSON.stringify(result)).not.toContain("sibling");
    test.expectReadOnly();
  });

  it("does not contact an unverified remote Podman endpoint", async () => {
    const test = fixture(
      {},
      {
        "podman system connection list --format json": JSON.stringify([
          {Default: true, URI: `ssh://${canary}@remote.example:22/run/podman/podman.sock`, Identity: "C:/keys/id"},
        ]),
      },
    );

    const result = await test.inspect();

    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "podman-backend", status: "blocked"}));
    expect(test.processCalls().map(({request}) => commandLine(request))).not.toContain("podman info --format json");
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it("reports structured backend evidence independently of launch prerequisites", async () => {
    const test = fixture({}, {"podman info --format json": trustedBackend});

    const result = await test.inspect();

    expect(result.status).toBe("blocked");
    expect(result.capabilities).toContainEqual(expect.objectContaining({id: "podman-backend", status: "pass"}));
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });

  it
    .runIf(process.platform === "win32")
    .each(["prepared", "unpinnable Podman", "restore failed", "unlock failed", "outdated inventory", "unsupported config"] as const)(
    "handles %s at the approved Setup action boundary without emitting raw restore diagnostics",
    async (scenario) => {
      const test = fixture(
        {
          "Parameters__sql-password": canary,
          "Parameters__redis-password": canary,
          SITE_ENV: canary,
          SITE_NAME: canary,
          SITE_URL: canary,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: canary,
          CLERK_SECRET_KEY: canary,
          NUGET_PACKAGES: cache,
          CAROOT: "C:/mkcert",
        },
        {
          "podman info --format json": trustedBackend,
          ...(scenario === "unpinnable Podman"
            ? {"podman machine inspect local-machine": JSON.stringify([{...localMachineInspect, Created: ""}])}
            : {}),
          "mkcert --version": "v1.4.4",
          pwsh: "trusted",
          "pwsh:swc": "verified",
          ...payloadFixtures,
        },
        {
          ...nextFiles,
          ...restoreFiles,
          ...pinnedCliFiles,
          ...resolverBundle(`${aspireHome}/bundle`),
          ...(scenario === "outdated inventory" ? {"C:/Program Files (x86)/NuGet/Config/New.config": "<configuration/>"} : {}),
          ...(scenario === "unsupported config"
            ? {[machineConfig]: configFiles[machineConfig].replace("C:/nuget", "%SYNTHETIC_CACHE%")}
            : {}),
          ...(scenario === "prepared"
            ? {
                [userConfig]: `\ufeff<?xml version="1.0" encoding="utf-8"?>\n<!-- example: %NOT_A_SETTING% -->${configFiles[userConfig].replace("Example.*", "Example&#46;*")}`,
              }
            : {}),
          "tooling/Directory.Build.targets": "<Project><PropertyGroup><ExampleProperty>1</ExampleProperty></PropertyGroup></Project>",
          "node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node": portableExecutable(),
          "sites/arolariu.ro/licenses.json": "{}",
          "scripts/__generated__/gql/README.placeholder.txt": "marker",
          [`${exp}/config.template.json`]: '{"Auth:Clerk:SecretKey":""}',
          [`${exp}/config.docker.json`]: JSON.stringify({"Auth:Clerk:SecretKey": canary}),
          [`${exp}/requirements.txt`]: "fastapi==0.163.2\nopentelemetry-exporter-otlp-proto-http~=1.45.2",
          [`${exp}/.venv/pyvenv.cfg`]: "include-system-site-packages = false",
          [`${exp}/.venv/Scripts/python.exe`]: "test stub",
          [`${exp}/.venv/Lib/site-packages/fastapi-0.163.2.dist-info/METADATA`]: "test stub",
          [`${exp}/.venv/Lib/site-packages/opentelemetry_exporter_otlp_proto_http-1.45.3.dist-info/METADATA`]: "test stub",
          "C:/mkcert/rootCA.pem": "public stub",
          "C:/mkcert/rootCA-key.pem": canary,
          [`${packageDir}/${assetFile}`]: portableExecutable(),
          [`${toolDir}/aspire.dll`]: portableExecutable(0x014c),
        },
        true,
        scenario === "restore failed",
      );

      const result = await test.inspect(root);

      expect(
        result.capabilities
          .filter(({status}) => status === "blocked")
          .map(({id}) => id)
          .sort(),
      ).toEqual(scenario === "unpinnable Podman" ? ["nuget-assets", "podman-backend"] : ["nuget-assets"]);
      expect(result.capabilities).toContainEqual(
        expect.objectContaining({id: "nuget-assets", status: "blocked", detail: expect.stringContaining("freshness")}),
      );
      expect(result).toMatchObject({status: "blocked", checkout: {head}});
      expect(JSON.stringify(result)).not.toContain(canary);
      test.expectReadOnly();

      const options = {dryRun: false, yes: true, verbose: true, refreshWorktreeRestoreEvidence: true};
      const paths = createRepositoryPaths(root);
      const inspection = recordingInspection({
        dotnet: () => ({
          kind: "available",
          durationMs: 0,
          value: {
            executable: {available: true, resolvedPaths: ["C:/dotnet/dotnet.exe"]},
            selectedVersion: "10.0.404",
            host: {version: "10.0.0", architecture: "x64", rid: "win-x64"},
            sdks: ["10.0.404"],
            workloads: [],
            localTools: [
              {name: "dotnet-ef", version: "10.0.0"},
              {name: "defaultdocumentation.console", version: "1.0.0"},
            ],
            solutionIssues: [],
            solutionRestoreIssues: [],
            appHost: {
              projectExists: true,
              missingParameterKeys: [],
              userSecretKeys: ["Parameters:sql-password", "Parameters:redis-password"],
            },
            certificate: {exists: true, trusted: true},
          },
        }),
      });
      const context = {
        options,
        paths,
        inspection: inspection.session,
        requirements: {
          node: {major: 24, minor: 15, patch: 0},
          npm: {major: 11, minor: 0, patch: 0},
          dotnet: {major: 10, minor: 0, patch: 0},
          python: {major: 3, minor: 12, patch: 0},
          packages: new Map(),
        },
      };
      const definition = createDotnetSetupPhase();
      const plan = {...options, dryRun: true};
      await Effect.runPromise(
        definition.run({...context, options: plan}).pipe(Effect.provide(Layer.provideMerge(setupActionsLayer(plan), test.layer))),
      );
      expect([...test.files().keys()].some((path) => path.endsWith(receiptPath))).toBe(false);
      expect(test.processCalls().some(({request}) => [forcedRestore, guardedRestore].includes(commandLine(request)))).toBe(false);
      let publishedBeforeUnlock = false;
      const setup = Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        return yield* definition.run(context).pipe(
          Effect.provideService(FileSystem.FileSystem, {
            ...fs,
            remove: (path, removeOptions) => {
              if (scenario !== "unlock failed" || !path.replaceAll("\\", "/").endsWith(lockPath)) return fs.remove(path, removeOptions);
              return Effect.suspend(() => {
                publishedBeforeUnlock = [...test.files().keys()].some((file) => file.endsWith(receiptPath));
                return Effect.fail(
                  PlatformError.systemError({
                    _tag: "PermissionDenied",
                    module: "FileSystem",
                    method: "remove",
                    description: `synthetic-auth-diagnostic:${canary}`,
                  }),
                );
              });
            },
          }),
        );
      });
      const phase = await Effect.runPromise(setup.pipe(Effect.provide(Layer.provideMerge(setupActionsLayer(options), test.layer))));
      const prepared = await test.inspect(root);
      expect(phase.status).toBe(scenario === "prepared" || scenario === "unpinnable Podman" ? "succeeded" : "failed");
      expect(JSON.stringify([phase, test.output()]).includes("synthetic-auth-diagnostic")).toBe(false);
      const refreshCalls = test.processCalls().filter(({request}) => [forcedRestore, guardedRestore].includes(commandLine(request)));
      if (scenario === "outdated inventory" || scenario === "unsupported config") {
        expect.soft(refreshCalls).toHaveLength(0);
        expect.soft(JSON.stringify([result.capabilities, phase.evidence])).not.toContain("SYNTHETIC_CACHE");
        for (const detail of [result.capabilities.find(({id}) => id === "nuget-assets")?.detail, phase.evidence.join("\n")]) {
          expect.soft(detail).toMatch(/missing or outdated config inventory.*ordinary approved Setup restore.*then.*receipt refresh/iu);
          expect.soft(detail).toMatch(/unsupported (?:MSBuild or NuGet )?inputs.*use supported inputs/iu);
        }
        expect([...test.files().keys()].some((path) => path.endsWith(receiptPath) || path.endsWith(lockPath))).toBe(false);
        return;
      }
      expect(refreshCalls.map(({request}) => commandLine(request))).toEqual([guardedRestore]);
      expect(refreshCalls[0]?.options).toMatchObject({
        output: "capture",
        echo: false,
      });
      if (scenario !== "prepared" && scenario !== "unpinnable Podman") {
        expect(phase.evidence.join("\n")).toContain(scenario === "unlock failed" ? "finalize" : "Forced solution NuGet restore failed");
        expect(JSON.stringify(test.output()).includes("Executed setup action 'dotnet.solution-restore'")).toBe(false);
        expect(prepared.capabilities).toContainEqual(expect.objectContaining({id: "nuget-assets", status: "blocked"}));
        expect([...test.files().keys()].some((path) => path.endsWith(lockPath))).toBe(scenario === "unlock failed");
        expect(publishedBeforeUnlock).toBe(scenario === "unlock failed");
        expect([...test.files().keys()].some((path) => path.endsWith(receiptPath))).toBe(false);
        return;
      }
      expect(phase.evidence.join("\n")).toContain("Executed and verified action: dotnet.solution-restore");
      expect(prepared.capabilities.filter(({status}) => status === "blocked").map(({id}) => id)).toEqual(
        scenario === "unpinnable Podman" ? ["podman-backend"] : [],
      );
      expect(prepared).toMatchObject({status: scenario === "unpinnable Podman" ? "blocked" : "prepared", checkout: {head}});
      if (scenario === "unpinnable Podman")
        expect(prepared.capabilities).toContainEqual({
          id: "podman-backend",
          status: "blocked",
          detail: "Machine bootstrap: No pinned default Windows Podman machine was verified. See Podman Desktop in infra/Local/readme.md.",
        });
      expect(test.processCalls().some(({request}) => commandLine(request) === "podman info --format json")).toBe(scenario === "prepared");
      expect(JSON.stringify(prepared)).not.toContain(canary);
      test.expectNoTransport();
    },
  );
});
