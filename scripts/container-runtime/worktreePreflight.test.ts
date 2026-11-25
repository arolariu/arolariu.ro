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

function commandLine(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].join(" ");
}

function fixture(
  variables: Readonly<Record<string, string>> = {},
  overrides: Readonly<Record<string, string>> = {},
  files: Readonly<Record<string, string>> = {},
  trustedDotnet = false,
) {
  const responses: Readonly<Record<string, string>> = {
    [`git ${gitCheckoutArgs.join(" ")}`]: `${root}\n${commonGitDir}/worktrees/task\n../../repo/.git\n`,
    "git symbolic-ref --quiet HEAD": "refs/heads/chore/task\n",
    "git rev-parse --verify HEAD": `${head}\n`,
    "podman system connection list --format json": JSON.stringify([
      {Default: true, URI: "ssh://dev@127.0.0.1:52000/run/user/1000/podman/podman.sock", Identity: "C:/keys/id"},
    ]),
    "podman info --format json": `podman-compose version 1.5.0 ${canary}`,
    "dotnet --list-sdks": "10.0.404 [C:/sdk]\n",
    ...overrides,
  };
  const harness = makeTestLayer({
    environment: {cwd: root, platform: "win32", variables},
    files: {
      "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
      "tooling/src/AppHost/AppHost.csproj": `<Sdk Name="Aspire.AppHost.Sdk" Version="13.6.5" />
        <AspireUseCliBundle>true</AspireUseCliBundle><AspireCliInvocationMode>DnxPinned</AspireCliInvocationMode>`,
      "tooling/Directory.Build.props": "<TargetFramework>net10.0</TargetFramework>",
      "C:/repo/.git/worktrees/task/gitdir": "",
      "C:/worktrees/sibling/node_modules/next/package.json": '{"version":"16.4.6"}',
      "C:/worktrees/sibling/sites/exp.arolariu.ro/.venv/Scripts/python.exe": "sibling only",
      "sites/arolariu.ro/.env": canary,
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
            expect(path).not.toMatch(/[/\\](?:\.env|config\.docker\.json|rootCA-key\.pem|secrets\.json)$/iu);
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
    const cache = "C:/nuget";
    const tool = `${cache}/aspire.cli/13.6.5`;
    const bin = `${tool}/tools/net10.0/any`;
    const exp = "sites/exp.arolariu.ro";
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
        "package-lock.json": JSON.stringify({
          lockfileVersion: 3,
          packages: {"": {name: "@arolariu/monorepo"}, "node_modules/next": {version: "16.4.6"}},
        }),
        "node_modules/next/package.json": '{"version":"16.4.6"}',
        "sites/arolariu.ro/licenses.json": "{}",
        "scripts/__generated__/gql/README.placeholder.txt": "marker",
        [`${exp}/config.docker.json`]: canary,
        [`${exp}/requirements.txt`]: "fastapi==0.163.2\nopentelemetry-exporter-otlp-proto-http~=1.45.2",
        [`${exp}/.venv/pyvenv.cfg`]: "include-system-site-packages = false",
        [`${exp}/.venv/Scripts/python.exe`]: "test stub",
        [`${exp}/.venv/Lib/site-packages/fastapi-0.163.2.dist-info/METADATA`]: "test stub",
        [`${exp}/.venv/Lib/site-packages/opentelemetry_exporter_otlp_proto_http-1.45.3.dist-info/METADATA`]: "test stub",
        "arolariu.slnx": '<Solution><Project Path="tooling/src/AppHost/AppHost.csproj" /></Solution>',
        "tooling/src/AppHost/obj/project.assets.json": "{}",
        "C:/mkcert/rootCA.pem": "public stub",
        "C:/mkcert/rootCA-key.pem": canary,
        [`${cache}/aspire.apphost.sdk/13.6.5/Sdk/Sdk.targets`]: "<Project />",
        [`${tool}/aspire.cli.nuspec`]: "test stub",
        [`${bin}/DotnetToolSettings.xml`]: "test stub",
        [`${bin}/bundle/dcp/dcp.exe`]: "test stub",
        [`${bin}/bundle/dashboard/Aspire.Dashboard.exe`]: "test stub",
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
