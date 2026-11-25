/**
 * @fileoverview Read-only prerequisite evidence for a native Windows Aspire worktree.
 * @module scripts/container-runtime/worktreePreflight
 */

import {win32} from "node:path";

import {Effect} from "effect";

import {describeGitCheckout} from "../commands/doctor/modules/workspace.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {inspectSolution} from "../inspection/dotnet.ts";
import {inspectionProbeRunner, probes} from "../inspection/probes.ts";
import {Environment, type EnvironmentSnapshot} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import {Process} from "../platform/Process.ts";

/** Input for the Windows/Podman prerequisite inspection. */
export interface WorktreePreflightInput {
  readonly expectedRoot?: string;
  readonly engine: "podman";
}

/** Canonical Git identity; no paths to configuration or credentials are included. */
export interface WorktreeCheckout {
  readonly root: string;
  readonly commonGitDir: string;
  readonly branch: string;
  readonly head: string;
}

/** Redacted evidence or a remediation checkpoint for one prerequisite. */
export interface WorktreeCapability {
  readonly id: string;
  readonly status: "pass" | "blocked";
  readonly detail: string;
}

/** Preparation is not a launch, ownership claim, or service health check. */
export type WorktreePreflightResult =
  | {readonly status: "prepared"; readonly checkout: WorktreeCheckout; readonly capabilities: readonly WorktreeCapability[]}
  | {readonly status: "blocked"; readonly checkout: WorktreeCheckout | null; readonly capabilities: readonly WorktreeCapability[]};

const appHost = "tooling/src/AppHost/AppHost.csproj";
const integrationKeys = ["SITE_ENV", "SITE_NAME", "SITE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"];
const parameters = ["Parameters:sql-password", "Parameters:redis-password"];
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const LOCK_PATH = /^(?:[@a-z0-9][@a-z0-9._-]*\/)*[@a-z0-9][@a-z0-9._-]*$/iu;
const run = inspectionProbeRunner.run;
const dotnetEnvironment = {
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
  DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: "false",
  DOTNET_NOLOGO: "1",
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
};

function capability(id: string, pass: boolean, observed: string, missing: string): WorktreeCapability {
  return {id, status: pass ? "pass" : "blocked", detail: pass ? observed : missing};
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function samePath(left: string, right: string): boolean {
  return win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase();
}

function localDrivePath(path: string | undefined): path is string {
  return path !== undefined && /^[a-z]:[\\/][^\u0000-\u001f]*$/iu.test(path);
}

function canonicalPath(path: string): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.realPath(path)).pipe(Effect.orElseSucceed(() => undefined));
}

// Disallow redirection through a junction/symlink. The checkout itself has already been canonicalized.
function ownedFile(path: string): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const canonical = yield* canonicalPath(path);
    if (canonical === undefined || !samePath(canonical, path)) return false;
    const files = yield* ReadOnlyFiles;
    const info = yield* files.stat(canonical);
    return info.type === "File" && info.size > 0;
  }).pipe(Effect.orElseSucceed(() => false));
}

function readManifest(path: string): Effect.Effect<string, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (!(yield* ownedFile(path))) return "";
    const files = yield* ReadOnlyFiles;
    const bytes = yield* files.readBytesBounded(path, MAX_MANIFEST_BYTES);
    return new TextDecoder().decode(bytes);
  }).pipe(Effect.orElseSucceed(() => ""));
}

function observeCheckout(
  input: Readonly<WorktreePreflightInput>,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreeCheckout | undefined, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    if (["git_dir", "git_work_tree", "git_common_dir", "git_namespace"].some((key) => names.has(key))) return undefined;
    const root = yield* canonicalPath(env.cwd);
    if (!localDrivePath(root)) return undefined;
    if (input.expectedRoot !== undefined) {
      const expected = yield* canonicalPath(win32.resolve(env.cwd, input.expectedRoot));
      if (expected === undefined || !samePath(expected, root)) return undefined;
    }

    const metadata = yield* run(probes.workspace.gitCheckout(), {cwd: root});
    if (metadata.kind !== "succeeded") return undefined;
    const checkout = yield* describeGitCheckout(metadata.stdout, root, env.platform);
    if (checkout?.kind !== "linked-worktree" || !localDrivePath(checkout.commonDirectory)) return undefined;
    const manifest = yield* readManifest(win32.join(root, "package.json"));
    if (record(parseJson(manifest))?.["name"] !== "@arolariu/monorepo") return undefined;

    const branch = yield* run(probes.workspace.gitBranch(), {cwd: root});
    const head = yield* run(probes.workspace.gitHead(), {cwd: root});
    if (branch.kind !== "succeeded" || head.kind !== "succeeded") return undefined;
    const branchName = /^refs\/heads\/([\p{L}\p{N}._/-]+)$/u.exec(branch.stdout.trimEnd())?.[1];
    const hash = head.stdout.trimEnd();
    if (branchName === undefined || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(hash)) return undefined;
    return {root, commonGitDir: checkout.commonDirectory, branch: branchName, head: hash};
  });
}

function inspectPodman(root: string, names: ReadonlySet<string>): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.gen(function* () {
    const blocked = (detail: string) => capability("podman-backend", false, "", `Machine bootstrap: ${detail}`);
    if (
      [
        "container_host",
        "container_connection",
        "container_sshkey",
        "containers_conf",
        "containers_conf_override",
        "podman_connections_conf",
      ].some((key) => names.has(key))
    ) {
      return blocked("Podman connection overrides are unsupported. Select the local Podman Desktop machine without overrides.");
    }
    const context = yield* run(probes.infrastructure.runtimeContext("podman"), {cwd: root});
    const connections = context.kind === "succeeded" ? parseJson(context.stdout) : undefined;
    const defaults = Array.isArray(connections) ? connections.map(record).filter((entry) => entry?.["Default"] === true) : [];
    const uri = defaults[0]?.["URI"];
    const identity = defaults[0]?.["Identity"];
    // A named Compose provider or an arbitrary remote connection is not engine evidence.
    if (
      defaults.length !== 1
      || typeof uri !== "string"
      || !/^ssh:\/\/[a-z0-9_.-]+@127\.0\.0\.1:[1-9]\d{0,4}\/run\/(?:user\/\d+\/)?podman\/podman\.sock$/iu.test(uri)
      || URL.parse(uri) === null
      || typeof identity !== "string"
      || !localDrivePath(identity)
    ) {
      return blocked("No supported default Windows Podman machine connection was observed. See Podman Desktop in infra/Local/readme.md.");
    }

    const info = yield* run(probes.infrastructure.runtimeInfo("podman"), {
      cwd: root,
      env: {CONTAINER_HOST: uri, CONTAINER_SSHKEY: identity},
    });
    const response = info.kind === "succeeded" ? record(parseJson(info.stdout)) : undefined;
    const version = record(response?.["version"])?.["Version"];
    const responsive =
      typeof version === "string"
      && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/u.test(version)
      && record(response?.["host"])?.["os"] === "linux"
      && record(response?.["store"]) !== undefined;
    return capability(
      "podman-backend",
      responsive,
      "The selected loopback Podman backend returned structured Linux engine information.",
      "Machine bootstrap: the local Podman backend did not return valid engine information. Verify the selected Podman machine separately.",
    );
  });
}

function keyEvidence(id: string, keys: readonly string[], names: ReadonlySet<string>, remediation: string): WorktreeCapability {
  const missing = keys.filter((key) => !names.has(key.toLowerCase()) && !names.has(key.replaceAll(":", "__").toLowerCase()));
  return capability(
    id,
    missing.length === 0,
    "Required environment key names are present; values and provider behavior were not inspected.",
    `Worktree preparation: key presence not observed: ${missing.join(", ")}. ${remediation} This check observes only environment key names, not secret files.`,
  );
}

function inspectWebsiteTrust(
  env: EnvironmentSnapshot,
  root: string,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const localAppData = env.variables["LOCALAPPDATA"];
    const caDir = env.variables["CAROOT"] ?? (localDrivePath(localAppData) ? win32.join(localAppData, "mkcert") : undefined);
    const missing =
      "Machine bootstrap: existing mkcert CA/signing-key presence or Windows root trust could not be verified. See Setup actions infrastructure.mkcert.install and infrastructure.mkcert.trust (separate approval).";
    if (names.has("node_tls_reject_unauthorized") || !localDrivePath(caDir)) return capability("website-tls", false, "", missing);
    const canonicalCa = yield* canonicalPath(caDir);
    if (!localDrivePath(canonicalCa)) return capability("website-tls", false, "", missing);
    const publicRoot = win32.join(canonicalCa, "rootCA.pem");
    const mkcert = yield* run(probes.infrastructure.mkcertVersion(), {cwd: root});
    const hasFiles = (yield* ownedFile(publicRoot)) && (yield* ownedFile(win32.join(canonicalCa, "rootCA-key.pem")));
    const trust =
      hasFiles && mkcert.kind === "succeeded" && /^v\d+\.\d+\.\d+$/u.test(mkcert.stdout.trim())
        ? yield* run(probes.infrastructure.windowsMkcertTrust(), {cwd: root, env: {AROLARIU_PREFLIGHT_PUBLIC_CA: publicRoot}})
        : undefined;
    return capability(
      "website-tls",
      trust?.kind === "succeeded" && trust.stdout.trim() === "trusted",
      "Windows trusts the existing mkcert root and its signing-key file is present; no scoped leaf or browser connection was exercised.",
      missing,
    );
  });
}

function inspectDotnetTls(root: string): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.map(run(probes.dotnet.certificate("trust"), {cwd: root, env: dotnetEnvironment}), (trust) =>
    capability(
      "dotnet-tls",
      trust.kind === "succeeded",
      "The .NET check-only probe accepted stock development certificate trust; API and dashboard HTTPS were not exercised.",
      `Machine bootstrap: ${trust.kind === "exited" && trust.exitCode === 7 ? "the stock .NET development certificate is untrusted (exit 7)" : "stock .NET development certificate trust was not established"}. See Setup actions dotnet.certificate.create and dotnet.certificate.trust (separate approval).`,
    ),
  );
}

function inspectNpm(root: string, names: ReadonlySet<string>): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const blocked = capability(
      "npm-dependencies",
      false,
      "",
      "Worktree preparation: the checkout-owned npm lockfile install was not verified. See Setup phase workspace.root-dependencies and the root npm ci prerequisite (separate approval).",
    );
    if (names.has("node_path")) return blocked;
    const lock = record(parseJson(yield* readManifest(win32.join(root, "package-lock.json"))));
    const packages = record(lock?.["packages"]);
    const manifest = record(parseJson(yield* readManifest(win32.join(root, "package.json"))));
    const lockedRoot = record(packages?.[""]);
    const lockedNext = record(packages?.["node_modules/next"]);
    if (
      lock?.["lockfileVersion"] !== 3
      || !packages
      || !manifest
      || !lockedRoot
      || lockedRoot["name"] !== manifest["name"]
      || typeof lockedNext?.["version"] !== "string"
      || lockedNext["optional"] === true
    )
      return blocked;
    for (const kind of ["dependencies", "devDependencies", "optionalDependencies"]) {
      const current = Object.entries(record(manifest[kind]) ?? {});
      const locked = record(lockedRoot[kind]) ?? {};
      if (current.length !== Object.keys(locked).length || current.some(([name, value]) => locked[name] !== value)) return blocked;
    }

    const entries = Object.entries(packages).filter(([path]) => /(?:^|\/)node_modules\//u.test(path));
    const valid = yield* Effect.forEach(
      entries,
      ([path, value]) =>
        Effect.gen(function* () {
          const entry = record(value);
          if (entry?.["optional"] === true) return true;
          if (!entry || !LOCK_PATH.test(path)) return false;
          const manifestPath = win32.join(root, path, "package.json");
          if (entry["link"] === true) {
            const target = entry["resolved"];
            if (typeof target !== "string" || !LOCK_PATH.test(target) || !record(packages[target])) return false;
            const expected = win32.join(root, target, "package.json");
            const actual = yield* canonicalPath(manifestPath);
            return actual !== undefined && samePath(actual, expected) && (yield* ownedFile(expected));
          }
          const manifest = record(parseJson(yield* readManifest(manifestPath)));
          return typeof entry["version"] === "string" && manifest?.["version"] === entry["version"];
        }),
      {concurrency: 16},
    );
    return valid.every(Boolean)
      ? capability(
          "npm-dependencies",
          true,
          "Required npm package manifests and workspace links match this checkout's lockfile; native modules were not executed.",
          "",
        )
      : blocked;
  });
}

function inspectWebsiteArtifacts(root: string): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.map(
    Effect.all([
      ownedFile(win32.join(root, "sites/arolariu.ro/licenses.json")),
      ownedFile(win32.join(root, "scripts/__generated__/gql/README.placeholder.txt")),
    ]),
    (observed) =>
      capability(
        "website-artifacts",
        observed.every(Boolean),
        "The website license and GraphQL generation markers are present in this checkout.",
        "Worktree preparation: required website generation markers were not found in this checkout. See Setup action workspace.generators.generate.",
      ),
  );
}

function inspectPython(paths: RepositoryPaths): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const blocked = capability(
      "python-dependencies",
      false,
      "",
      "Worktree preparation: local exp .venv and requirement versions were not verified. See Setup actions python.venv.create and python.dependencies.install (separate approval).",
    );
    const venv = win32.join(paths.expRoot, ".venv");
    const requirements = yield* readManifest(win32.join(paths.expRoot, "requirements.txt"));
    const venvConfig = yield* readManifest(win32.join(venv, "pyvenv.cfg"));
    if (!/^include-system-site-packages\s*=\s*false\s*$/imu.test(venvConfig) || !(yield* ownedFile(win32.join(venv, "Scripts/python.exe"))))
      return blocked;

    const files = yield* ReadOnlyFiles;
    const packages = win32.join(venv, "Lib/site-packages");
    const actual = yield* canonicalPath(packages);
    if (actual === undefined || !samePath(actual, packages)) return blocked;
    const entries = yield* files.readDirectory(packages).pipe(Effect.orElseSucceed((): readonly string[] => []));
    const lines = requirements
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    const match = yield* Effect.forEach(lines, (line) =>
      Effect.gen(function* () {
        const spec = /^([a-z0-9][a-z0-9_.-]*)(==|~=)(\d+\.\d+)\.(\d+)([ab]\d+|rc\d+)?$/iu.exec(line);
        const [, name, operator, series, patch, suffix] = spec ?? [];
        if (!name || !series || !patch || (operator === "~=" && suffix)) return false;
        const prefix = `${name.toLowerCase().replaceAll(/[-_.]+/gu, "_")}-`;
        const candidates = entries.filter((entry) => entry.toLowerCase().startsWith(prefix) && entry.endsWith(".dist-info"));
        const [entry] = candidates;
        if (candidates.length !== 1 || entry === undefined) return false;
        const version = entry.slice(prefix.length, -".dist-info".length);
        const compatiblePatch = version.startsWith(`${series}.`) ? version.slice(series.length + 1) : "";
        const matches =
          operator === "=="
            ? version === `${series}.${patch}${suffix ?? ""}`
            : /^\d+$/u.test(compatiblePatch) && Number(compatiblePatch) >= Number(patch);
        return matches && (yield* ownedFile(win32.join(packages, entry, "METADATA")));
      }),
    );
    return lines.length > 0 && match.every(Boolean)
      ? capability(
          "python-dependencies",
          true,
          "The checkout-owned exp virtual environment contains metadata for its declared requirements; Python was not launched.",
          "",
        )
      : blocked;
  });
}

function inspectBundle(
  paths: RepositoryPaths,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
): Effect.Effect<readonly WorktreeCapability[], never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const project = yield* readManifest(win32.join(paths.root, appHost));
    const props = yield* readManifest(win32.join(paths.root, "tooling/Directory.Build.props"));
    const pin = /<Sdk Name="Aspire\.AppHost\.Sdk" Version="(\d+\.\d+\.\d+)"\s*\/>/u.exec(project)?.[1];
    const framework = /<TargetFramework>net(\d+)\.(\d+)<\/TargetFramework>/u.exec(props);
    const sdks = yield* run(probes.dotnet.sdkList(), {cwd: paths.root, env: dotnetEnvironment});
    const sdk =
      framework !== null
      && sdks.kind === "succeeded"
      && sdks.stdout
        .split(/\r?\n/u)
        .some((line) => line.startsWith(`${framework[1]}.${framework[2]}.`) && /^\d+\.\d+\.\d+ \[.+\]$/u.test(line));
    const solution = yield* inspectSolution(paths);
    const assets = solution.issues.length === 0 && solution.restoreIssues.length === 0;

    const home = env.variables["USERPROFILE"];
    const cache = env.variables["NUGET_PACKAGES"] ?? (localDrivePath(home) ? win32.join(home, ".nuget/packages") : undefined);
    let bundle = false;
    const overrides = ["aspireclipath", "aspirecliinvocationmode", "dcpdir", "aspiredashboarddir", "aspiredashboardpath"];
    if (
      pin
      && sdk
      && localDrivePath(cache)
      && !overrides.some((name) => names.has(name))
      && project.includes("<AspireUseCliBundle>true</AspireUseCliBundle>")
      && project.includes("<AspireCliInvocationMode>DnxPinned</AspireCliInvocationMode>")
    ) {
      const sdkFile = win32.join(cache, "aspire.apphost.sdk", pin, "Sdk/Sdk.targets");
      const tool = win32.join(cache, "aspire.cli", pin);
      const cli = yield* ownedFile(win32.join(tool, "aspire.cli.nuspec"));
      if (cli && (yield* ownedFile(sdkFile))) {
        const rid = env.architecture === "x64" || env.architecture === "arm64" ? `win-${env.architecture}` : undefined;
        if (rid && framework) {
          for (const layout of [rid, "any"]) {
            const toolDir = win32.join(tool, `tools/net${framework[1]}.${framework[2]}`, layout);
            const directory = win32.join(toolDir, "bundle");
            const explicitBundle = env.variables["AspireCliBundlePath"];
            if (explicitBundle !== undefined && !samePath(explicitBundle, directory)) continue;
            if (
              (yield* ownedFile(win32.join(toolDir, "DotnetToolSettings.xml")))
              && (yield* ownedFile(win32.join(directory, "dcp/dcp.exe")))
              && (yield* ownedFile(win32.join(directory, "dashboard/Aspire.Dashboard.exe")))
            ) {
              bundle = true;
              break;
            }
          }
        }
      }
    }
    return [
      capability(
        "dotnet-sdk",
        sdk,
        "A stable SDK for the tooling target framework is listed.",
        "Machine bootstrap: the required .NET SDK was not observed. See Setup action dotnet.install-sdk.",
      ),
      capability(
        "nuget-assets",
        assets,
        "Managed projects have checkout-owned restore artifacts; offline restore was not attempted.",
        "Worktree preparation: solution restore artifacts could not be verified. See Setup action dotnet.solution-restore.",
      ),
      capability(
        "aspire-bundle",
        bundle,
        "The paired AppHost SDK, DNX tool and colocated Windows Dashboard/DCP bundle files were observed; they were not executed.",
        "Machine bootstrap: pinned Aspire CLI or paired Dashboard/DCP bundle files are absent or unsupported in the offline cache. See tooling/README.md (Development and debugging) for separately approved bundle preparation.",
      ),
    ];
  });
}

/**
 * Inspects an attached, canonical Windows worktree and its bounded local prerequisites.
 * No setup action, credential file read, trust mutation, AppHost or provider launch is performed.
 *
 * @param input - Expected canonical checkout and explicit Podman engine selection.
 * @returns Redacted evidence. Only a separate, approved runtime check can verify an owned launch.
 */
export function inspectWorktreeAspire(
  input: Readonly<WorktreePreflightInput>,
): Effect.Effect<WorktreePreflightResult, never, Environment | Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const env = yield* Environment;
    const process = yield* Process;
    const keys = Object.keys(env.variables);
    const omitted = Object.fromEntries(
      keys
        .filter((key) =>
          /(?:token|secret|password|credentials?|(?:api|publishable|private|access|secret)[_-]?key|connection[_-]?string|proxy)$/iu.test(
            key,
          ),
        )
        .map((key) => [key, undefined]),
    );
    return yield* inspect(env, input, new Set(keys.map((key) => key.toLowerCase()))).pipe(
      Effect.provideService(Process, {
        run: (request, options) => process.run(request, {...options, echo: false, env: {...options?.env, ...omitted}}),
      }),
    );
  });
}

function inspect(
  env: EnvironmentSnapshot,
  input: Readonly<WorktreePreflightInput>,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreePreflightResult, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (env.platform !== "win32" || input.engine !== "podman") {
      return {
        status: "blocked",
        checkout: null,
        capabilities: [capability("checkout", false, "", "Worktree preflight supports native Windows and explicit Podman only.")],
      };
    }
    const checkout = yield* observeCheckout(input, env, names);
    if (checkout === undefined) {
      return {
        status: "blocked",
        checkout: null,
        capabilities: [
          capability(
            "checkout",
            false,
            "",
            "Run from the expected, attached arolariu.ro linked-worktree root; checkout identity was not established.",
          ),
        ],
      };
    }
    const {root} = checkout;
    const paths = createRepositoryPaths(root);
    const checks = yield* Effect.all(
      [
        inspectPodman(root, names),
        inspectWebsiteTrust(env, root, names),
        inspectDotnetTls(root),
        inspectNpm(root, names),
        inspectWebsiteArtifacts(root),
        inspectPython(paths),
        Effect.map(ownedFile(win32.join(paths.expRoot, "config.docker.json")), (present) =>
          capability(
            "exp-config",
            present,
            "The checkout-owned config.docker.json source is present; its keys and values were not loaded.",
            "Worktree preparation: exp config.docker.json is missing or not checkout-owned. See the config.template.json instructions in ExpConfigGenerator.",
          ),
        ),
      ],
      {concurrency: "unbounded"},
    );
    const capabilities = [
      capability("checkout", true, "Canonical, attached linked-worktree identity was observed.", ""),
      keyEvidence(
        "apphost-config",
        parameters,
        names,
        "See the user-scoped Setup action dotnet.user-secrets.set for standard development.",
      ),
      keyEvidence("website-config", integrationKeys, names, "See Setup action react.environment.write for standard development."),
      ...checks,
      ...(yield* inspectBundle(paths, env, names)),
    ];
    return {status: capabilities.every((entry) => entry.status === "pass") ? "prepared" : "blocked", checkout, capabilities};
  });
}
