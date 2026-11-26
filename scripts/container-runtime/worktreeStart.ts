/** @fileoverview Starts the selected checkout's verified native Aspire graph. */
import {Effect, Result} from "effect";
import {win32} from "node:path";

import {Environment} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import type {PlatformServices} from "../platform/layers.ts";
import {Presenter} from "../platform/Output.ts";
import {Process} from "../platform/Process.ts";
import {runOwnedWorktreeProcess} from "../platform/WorktreeProcess.ts";
import type {ContainerEngine} from "./types.ts";
import {getContainerAdapter} from "./adapters.ts";
import {beginWorktreeLaunch, retireExitedWorktreeLaunch, stopWorktreeLaunch} from "./worktreeAspire.ts";
import {
  claimWorktreeLaunch,
  isWorktreeRunId,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLaunch,
  WorktreeLaunchError,
  WorktreePlatform,
  worktreeOperation,
} from "./worktreeLease.ts";
import {worktreeIO} from "../platform/WorktreeHost.ts";
import {openWorktreeRegistryRoute} from "./worktreePlatform.ts";
import {bindWorktreeEngine, inspectWorktreeAspire, observeWorktreeCheckout} from "./worktreePreflight.ts";
import {prepareWorktreeVolumes} from "./worktreeVolumes.ts";

const registryName = "arolariu-native-aspire-v4";

function currentRegistry(native: string, cwd: string, process: typeof Process.Service, create: boolean) {
  return Effect.gen(function* () {
    const result = yield* process.run(
      {command: native, args: ["--worktree-registry", create ? "create" : "read"]},
      {cwd, echo: false, output: "capture"},
    );
    const path = result.stdout.trimEnd();
    if (!create && path === "absent") return null;
    const parent = win32.dirname(path);
    if (path !== win32.join(parent, registryName)) return yield* Effect.fail(new Error("Invalid native registry path"));
    return yield* openWorktreeRegistryRoute(parent, () => Effect.succeed(path));
  });
}

/** Requests cooperative shutdown of the exact foreground run; never signals a PID. */
export function requestNativeWorktreeStop(
  engine: ContainerEngine,
  runId: string,
): Effect.Effect<void, WorktreeLaunchError, PlatformServices> {
  return Effect.gen(function* () {
    const fail = () => new WorktreeLaunchError({message: "The requested foreground run is not current on the verified engine."});
    if (!isWorktreeRunId(runId)) return yield* fail();
    const checkout = yield* observeWorktreeCheckout();
    if (!checkout) return yield* fail();
    const binding = yield* bindWorktreeEngine(checkout, engine);
    if (!binding) return yield* fail();
    const process = yield* Process;
    const files = yield* ReadOnlyFiles;
    const executable = win32.join(checkout.root, "tooling/src/AppHost/bin/Debug/net10.0/AppHost.exe");
    const native = yield* files.realPath(executable).pipe(Effect.orElseSucceed(() => ""));
    if (win32.normalize(native).toLowerCase() !== executable.toLowerCase()) return yield* fail();
    const registry = (create: boolean) => currentRegistry(native, checkout.root, process, create);
    return yield* Effect.gen(function* () {
      const lease = yield* readWorktreeLaunch(checkout);
      if (
        !lease
        || lease.mode !== "aspire"
        || lease.phase !== "pending"
        || lease.engine !== engine
        || lease.engineId !== binding.fingerprint
        || lease.runId !== runId
      )
        return yield* fail();
      const root = yield* worktreeOperation("The native registry could not be checked.", registry(false));
      if (!root) return yield* fail();
      const request = win32.join(root, lease.scopeId, lease.runId, "foreground-stop.json");
      yield* worktreeOperation(
        "Could not publish the scoped stop request.",
        worktreeIO(() => publishWorktreeJson(request, runId)),
      );
    }).pipe(
      Effect.provideService(WorktreePlatform, {
        registry,
        checkout: Effect.succeed(checkout),
        engine: Effect.succeed(binding.fingerprint),
        engineKind: engine,
        candidatePort: () => 0,
        processIdentity: () => Effect.succeed(null),
      }),
    );
  });
}

/** Runs an isolated Windows worktree stack in the foreground using its own registered launch resources. */
export function startNativeWorktree(engine: ContainerEngine): Effect.Effect<void, WorktreeLaunchError, PlatformServices> {
  return Effect.gen(function* () {
    const fail = (message: string) => new WorktreeLaunchError({message});
    const env = yield* Environment;
    if (env.platform !== "win32" || env.architecture !== "x64")
      return yield* fail("Native scoped launch requires a prepared Windows x64 host.");
    const preflight = yield* inspectWorktreeAspire({engine});
    if (preflight.status !== "prepared") {
      const blocked = preflight.capabilities.filter((check) => check.status === "blocked").map((check) => check.id);
      return yield* fail(`Scoped preflight is blocked: ${blocked.join(", ")}.`);
    }

    const checkout = preflight.checkout;
    const observe = bindWorktreeEngine(checkout, engine);
    const binding = yield* observe;
    if (!binding) return yield* fail("No verified local engine transport is available.");
    const process = yield* Process;
    const files = yield* ReadOnlyFiles;
    const project = win32.join(checkout.root, "tooling/src/AppHost/AppHost.csproj");
    const build = yield* Effect.result(
      process.run(
        {command: "dotnet", args: ["build", project, "--no-restore", "-noAutoResponse", "--nologo", "-v:q"]},
        {cwd: checkout.root, echo: false, output: "capture"},
      ),
    );
    if (Result.isFailure(build)) return yield* fail("The checkout AppHost build failed.");

    const appHost = win32.join(checkout.root, "tooling/src/AppHost/bin/Debug/net10.0/AppHost.exe");
    const native = yield* files.realPath(appHost).pipe(Effect.orElseSucceed(() => ""));
    if (win32.normalize(native).toLowerCase() !== appHost.toLowerCase())
      return yield* fail("The AppHost executable is not checkout-owned.");
    const presenter = yield* Presenter;
    const docs = yield* Effect.result(
      process.run(
        {command: env.executablePath, args: [win32.join(checkout.root, "scripts/cli.ts"), "docs", "prepare-site", "--json"]},
        {cwd: checkout.root, echo: false, output: "capture"},
      ),
    );
    if (Result.isFailure(docs)) return yield* fail("The scoped documentation site could not be prepared.");
    const registry = (create: boolean) => currentRegistry(native, checkout.root, process, create);
    const verifyCheckout = observeWorktreeCheckout().pipe(
      Effect.provideService(Environment, env),
      Effect.provideService(Process, process),
      Effect.provideService(ReadOnlyFiles, files),
    );
    const platform = {
      registry,
      checkout: verifyCheckout,
      engineKind: engine,
      engine: Effect.succeed(binding.fingerprint),
      candidatePort: () => 0,
      processIdentity: () => Effect.succeed(null),
    };
    return yield* Effect.gen(function* () {
      const lease = yield* claimWorktreeLaunch(checkout);
      yield* presenter.line("stdout", `Scoped ${engine} foreground run: ${lease.runId}.`);
      const volumes = yield* prepareWorktreeVolumes(lease, observe).pipe(Effect.tapError(() => stopWorktreeLaunch(lease)));
      const stage = yield* beginWorktreeLaunch(lease).pipe(Effect.tapError(() => stopWorktreeLaunch(lease)));
      const current = yield* verifyCheckout;
      const refreshed = yield* observe;
      if (current?.branch !== lease.branch || current.head !== lease.head || refreshed?.fingerprint !== lease.engineId)
        return yield* fail("The worktree or local engine changed during launch preparation.");

      const environment = Object.fromEntries(
        Object.entries(env.variables).flatMap(([key, value]) =>
          value === undefined
          || /^(?:aspire|docker_|container_|dcp|dotnet_aspire|kestrel|as(pnetcore|pire)_|otel_|node_options)/iu.test(key)
            ? []
            : [[key, value]],
        ),
      );
      Object.assign(environment, refreshed.environment, {
        ASPIRE_HOME: env.variables["ASPIRE_HOME"] ?? "",
        ASPNETCORE_ENVIRONMENT: "Development",
        DOTNET_ENVIRONMENT: "Development",
        AROLARIU_WORKTREE_DESCRIPTOR: stage.descriptor,
      });
      const result = yield* Effect.result(
        runOwnedWorktreeProcess(
          native,
          checkout.root,
          environment,
          JSON.stringify({
            ScopeId: lease.scopeId,
            Root: lease.root,
            CommonGitDirectory: lease.commonGitDir,
            Branch: lease.branch,
            Head: lease.head,
            Engine: engine,
            EnginePin: lease.engineId,
            NodeExecutable: env.executablePath,
            Volumes: volumes,
          }),
          (line) => {
            if (line === "worktree-website-healthy")
              return presenter.line(
                "stdout",
                `Scoped graph is healthy. Website: https://wt-${lease.scopeId}.localhost:${lease.ports.website}.`,
              );
            if (/^worktree-(?:phase|failure):[A-Za-z0-9-]{1,70}$/u.test(line)) return presenter.line("stdout", line);
            return Effect.void;
          },
          Effect.gen(function* () {
            while ((yield* readWorktreeJson(win32.join(stage.directory, "foreground-stop.json"))) !== lease.runId)
              yield* Effect.sleep("250 millis");
          }),
        ),
      );
      if (Result.isFailure(result)) return yield* fail("The scoped AppHost could not be supervised; the pending lease was preserved.");
      const checked = yield* observe;
      if (checked?.fingerprint !== lease.engineId) return yield* fail("The selected engine changed during the foreground run.");
      const list = process.run(
        {
          command: getContainerAdapter(engine).primaryCli,
          args: ["ps", "-a", "--filter", `label=ro.arolariu.worktree.run=${lease.runId}`, "--format", "{{.ID}}"],
        },
        {cwd: checkout.root, env: checked.environment, echo: false, output: "capture", timeout: "10 seconds"},
      );
      const residue = yield* Effect.result(list);
      const noContainers = Result.isSuccess(residue) && residue.success.stdout.trim() === "";
      yield* retireExitedWorktreeLaunch(lease, async () => noContainers);
      if (result.success !== 0) return yield* fail("The scoped AppHost did not complete startup or shutdown.");
    }).pipe(Effect.provideService(WorktreePlatform, platform));
  });
}
