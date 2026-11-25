// @vitest-environment node
import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import type {ProcessRequest} from "../common/runner.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import {makeTestLayer, scriptedOutcomes} from "../platform/testing.ts";
import {inspectWorktreeAspire} from "./worktreePreflight.ts";

const root = "C:/worktrees/task";
const commonGitDir = "C:/repo/.git";
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
};
const exp = "sites/exp.arolariu.ro";
const venv = `${exp}/.venv`;
const cache = "C:/nuget";
const tool = `${cache}/aspire.cli/13.6.5`;
const toolDir = `${tool}/tools/net10.0/any`;
const appHostName = "tooling/src/AppHost/AppHost.csproj";
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
  "arolariu.slnx": `<Solution><Project Path="${appHostName}" /></Solution>`,
  "tooling/src/AppHost/obj/project.assets.json": JSON.stringify({
    version: 4,
    project: {restore: {projectPath: `${root}/${appHostName}`}},
    projectFileDependencyGroups: {"net10.0": ["Example.Sdk >= 1.2.3"]},
    packageFolders: {[cache]: {}},
    libraries: {"Example.Sdk/1.2.3": {type: "package", path: assetPackage, sha512: packageHash}},
    targets: {"net10.0": {"Example.Sdk/1.2.3": {type: "package", runtime: {[assetFile]: {}}}}},
  }),
  [`${packageDir}/.nupkg.metadata`]: JSON.stringify({version: 2, contentHash: packageHash}),
  [`${packageDir}/example.sdk.1.2.3.nupkg.sha512`]: `${"b".repeat(86)}==`,
  [`${packageDir}/example.sdk.nuspec`]: "<package/>",
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
  [`${toolDir}/aspire.runtimeconfig.json`]: '{"runtimeOptions":{"tfm":"net10.0"}}',
  [`${toolDir}/aspire.deps.json`]: '{"targets":{"net10.0":{"Aspire.Cli/13.6.5":{}}}}',
  [`${toolDir}/bundle/dcp/dcp.exe`]: portableExecutable(),
  [`${toolDir}/bundle/dashboard/Aspire.Dashboard.exe`]: portableExecutable(),
};

function commandLine(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].join(" ");
}

function fixture(
  variables: Readonly<Record<string, string>> = {},
  overrides: Readonly<Record<string, string>> = {},
  files: Readonly<Record<string, string | Uint8Array>> = {},
  trustedDotnet = false,
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
    ...overrides,
  };
  const harness = makeTestLayer({
    environment: {cwd: root, platform: "win32", architecture: "x64", variables: {APPDATA: "C:/appdata", ...variables}},
    files: {
      "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
      "tooling/src/AppHost/AppHost.csproj": `<Sdk Name="Aspire.AppHost.Sdk" Version="13.6.5" />
        <AspireUseCliBundle>true</AspireUseCliBundle><AspireCliInvocationMode>DnxPinned</AspireCliInvocationMode><UserSecretsId>test-apphost</UserSecretsId>`,
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
      scriptedOutcomes((request) => {
        const command = commandLine(request);
        if (command === "dotnet dev-certs https --check --trust") {
          if (trustedDotnet) return {kind: "succeeded", exitCode: 0, stdout: "", stderr: canary, durationMs: 0};
          return {kind: "exited", exitCode: 7, stdout: "", stderr: canary, durationMs: 0};
        }
        const trackedCommand = request.command === "pwsh" ? "pwsh" : command;
        const stdout = responses[trackedCommand];
        if (stdout === undefined) throw new Error("Unapproved process in preflight");
        return {kind: "succeeded", exitCode: 0, stdout, stderr: canary, durationMs: 0};
      }),
    ],
  });
  const before = harness.files();
  return {
    ...harness,
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
            ({request}) =>
              Object.hasOwn(responses, request.command === "pwsh" ? "pwsh" : commandLine(request))
              || commandLine(request) === "dotnet dev-certs https --check --trust",
          ),
      ).toBe(true);
    },
  };
}

describe("worktree Aspire preflight", () => {
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
    const test = fixture({NUGET_PACKAGES: cache}, {}, {...restoreFiles, ...cliBundleFiles});
    const result = await test.inspect();
    for (const id of ["nuget-assets", "aspire-bundle"])
      expect(result.capabilities).toContainEqual(expect.objectContaining({id, status: "blocked"}));
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
      {},
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
      {},
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

  it.runIf(process.platform === "win32")("reports prepared for positively observed prerequisites only", async () => {
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
        "mkcert --version": "v1.4.4",
        pwsh: "trusted",
      },
      {
        ...nextFiles,
        ...restoreFiles,
        ...cliBundleFiles,
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
    );

    const result = await test.inspect(root);

    expect(result.capabilities.filter(({status}) => status === "blocked")).toEqual([]);
    expect(result).toMatchObject({status: "prepared", checkout: {head}});
    expect(JSON.stringify(result)).not.toContain(canary);
    test.expectReadOnly();
  });
});
