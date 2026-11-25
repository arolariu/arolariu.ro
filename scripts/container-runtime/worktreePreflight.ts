/**
 * @fileoverview Read-only prerequisite evidence for a native Windows Aspire worktree.
 * @module scripts/container-runtime/worktreePreflight
 */

import {win32} from "node:path";

import {Effect} from "effect";

import {describeGitCheckout} from "../commands/doctor/modules/workspace.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {inspectSolution, projectAppHostParameterKeys} from "../inspection/dotnet.ts";
import {inspectPath} from "../inspection/files.ts";
import {inspectionProbeRunner, probes} from "../inspection/probes.ts";
import {matchesLocalPythonPin, parseConfigurationObject} from "../inspection/python.ts";
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

function machineType(architecture: string): number | undefined {
  return architecture === "x64" ? 0x8664 : architecture === "arm64" ? 0xaa64 : undefined;
}

function isPortableExecutable(path: string, architecture: string, managed = false): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const machine = machineType(architecture);
    if (machine === undefined || !(yield* ownedFile(path))) return false;
    const files = yield* ReadOnlyFiles;
    const bytes = yield* files.readPrefix(path);
    if (bytes.length < 88 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const offset = view.getUint32(60, true);
    if (offset < 64 || offset > bytes.length - 24 || view.getUint32(offset, true) !== 0x4550) return false;
    const target = view.getUint16(offset + 4, true);
    if (target !== machine && !(managed && target === 0x014c)) return false;
    const sectionCount = view.getUint16(offset + 6, true);
    const optionalSize = view.getUint16(offset + 20, true);
    const table = offset + 24 + optionalSize;
    if (sectionCount < 1 || optionalSize < 96 || table + sectionCount * 40 > bytes.length) return false;
    if (view.getUint16(offset + 24, true) !== (target === 0x014c ? 0x010b : 0x020b)) return false;
    const length = (yield* files.stat(path)).size;
    let hasPayload = false;
    for (let section = 0; section < sectionCount; section++) {
      const start = table + section * 40;
      const size = view.getUint32(start + 16, true);
      if (size === 0) continue;
      const position = view.getUint32(start + 20, true);
      if (position < table + sectionCount * 40 || position + size > length) return false;
      hasPayload = true;
    }
    return hasPayload;
  }).pipe(Effect.orElseSucceed(() => false));
}

type PayloadRole = "cli" | "cli-native" | "dcp" | "managed" | "dashboard" | "swc";

function inspectPayload(
  root: string,
  path: string,
  architecture: string,
  role: PayloadRole,
  version = "",
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    if (!(yield* isPortableExecutable(path, architecture, role === "cli"))) return false;
    const outcome = yield* run(probes.infrastructure.windowsPayload(), {
      cwd: root,
      env: {
        AROLARIU_PREFLIGHT_PAYLOAD_ROLE: role,
        AROLARIU_PREFLIGHT_PAYLOAD_PATH: path,
        AROLARIU_PREFLIGHT_PAYLOAD_VERSION: version,
      },
    });
    return outcome.kind === "succeeded" && outcome.stdout.trim() === "verified";
  });
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
    const listing = yield* run(probes.workspace.gitWorktreeList(), {cwd: root});
    if (listing.kind !== "succeeded" || !listing.stdout.endsWith("\0\0")) return undefined;
    const registrations = listing.stdout.split("\0\0").map((entry) => entry.split("\0"));
    const matches = registrations.filter(([path]) => path?.startsWith("worktree ") && samePath(path.slice(9), root));
    const [registration] = matches;
    if (
      matches.length !== 1
      || !registration
      || registration.filter((entry) => entry.startsWith("HEAD ")).join() !== `HEAD ${hash}`
      || registration.filter((entry) => entry.startsWith("branch ")).join() !== `branch refs/heads/${branchName}`
      || registration.some((entry) => /^(?:bare|detached|prunable)(?: |$)/u.test(entry))
    )
      return undefined;
    return {root, commonGitDir: checkout.commonDirectory, branch: branchName, head: hash};
  });
}

function registeredPodmanConnection(
  root: string,
  name: string,
  uri: string,
  identity: string,
): Effect.Effect<boolean, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const endpoint = URL.parse(uri);
    if (endpoint === null) return false;
    const port = Number(endpoint.port);
    const listing = yield* run(probes.infrastructure.podmanMachineList(), {cwd: root});
    const machines = listing.kind === "succeeded" ? parseJson(listing.stdout) : undefined;
    if (!Array.isArray(machines)) return false;
    const registrations = machines.map(record);
    const candidates = registrations.filter((entry) => entry?.["Name"] === name || `${String(entry?.["Name"])}-root` === name);
    const [candidate] = candidates;
    const machine = candidate?.["Name"];
    if (
      candidates.length !== 1
      || !candidate
      || typeof machine !== "string"
      || !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/iu.test(machine)
      || candidate["Running"] !== true
      || candidate["Starting"] !== false
      || registrations.filter((entry) => entry?.["Running"] === true && entry["Port"] === port).length !== 1
    )
      return false;
    const user = candidate["RemoteUsername"];
    const listedIdentity = candidate["IdentityPath"];
    if (
      candidate["Port"] !== port
      || typeof user !== "string"
      || !/^[a-z0-9_.-]+$/iu.test(user)
      || typeof listedIdentity !== "string"
      || !samePath(identity, listedIdentity)
    )
      return false;
    const sshMatches = (ssh: Readonly<Record<string, unknown>> | undefined): boolean => {
      const path = ssh?.["IdentityPath"];
      return ssh?.["Port"] === port && ssh["RemoteUsername"] === user && typeof path === "string" && samePath(path, identity);
    };

    const inspection = yield* run(probes.infrastructure.podmanMachineInspect(machine), {cwd: root});
    const result = inspection.kind === "succeeded" ? parseJson(inspection.stdout) : undefined;
    const selected = Array.isArray(result) && result.length === 1 ? record(result[0]) : undefined;
    const configDir = record(selected?.["ConfigDir"])?.["Path"];
    const rootful = selected?.["Rootful"];
    if (
      selected?.["Name"] !== machine
      || selected["State"] !== "running"
      || typeof rootful !== "boolean"
      || !sshMatches(record(selected["SSHConfig"]))
      || typeof configDir !== "string"
      || !localDrivePath(configDir)
    )
      return false;

    // Machine inspect describes SSH but not the guest UID needed to identify the rootless socket.
    const document = record(parseJson(yield* readManifest(win32.join(configDir, `${machine}.json`))));
    const hostUser = record(document?.["HostUser"]);
    const uid = hostUser?.["UID"];
    if (
      document?.["Name"] !== machine
      || hostUser?.["Rootful"] !== rootful
      || !sshMatches(record(document["SSH"]))
      || (!rootful && (typeof uid !== "number" || !Number.isSafeInteger(uid) || uid < 1))
    )
      return false;
    const expectedName = rootful ? `${machine}-root` : machine;
    const socket = rootful ? "/run/podman/podman.sock" : `/run/user/${String(uid)}/podman/podman.sock`;
    return name === expectedName && uri === `ssh://${rootful ? "root" : user}@127.0.0.1:${port}${socket}` && (yield* ownedFile(identity));
  });
}

function inspectPodman(root: string, names: ReadonlySet<string>): Effect.Effect<WorktreeCapability, never, Process | ReadOnlyFiles> {
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
    const entries = Array.isArray(connections) ? connections.map(record) : [];
    const defaults = entries.filter((entry) => entry?.["Default"] === true);
    const uri = defaults[0]?.["URI"];
    const identity = defaults[0]?.["Identity"];
    const name = defaults[0]?.["Name"];
    if (
      defaults.length !== 1
      || typeof name !== "string"
      || entries.filter((entry) => entry?.["Name"] === name).length !== 1
      || typeof uri !== "string"
      || !/^ssh:\/\/[a-z0-9_.-]+@127\.0\.0\.1:[1-9]\d{0,4}\/run\/(?:user\/\d+\/)?podman\/podman\.sock$/iu.test(uri)
      || URL.parse(uri) === null
      || typeof identity !== "string"
      || !localDrivePath(identity)
      || !(yield* registeredPodmanConnection(root, name, uri, identity))
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
      "The registered local Podman machine returned structured Linux engine information.",
      "Machine bootstrap: the local Podman backend did not return valid engine information. Verify the selected Podman machine separately.",
    );
  });
}

function keyEvidence(
  id: string,
  keys: readonly string[],
  sources: readonly ReadonlyMap<string, boolean>[],
  remediation: string,
): WorktreeCapability {
  const missing = keys.filter((key) => sources.find((source) => source.has(key))?.get(key) !== true);
  return capability(
    id,
    missing.length === 0,
    "Required keys are configured in the supported launch configuration sources; provider behavior was not verified.",
    `Worktree preparation: required keys are missing or blank: ${missing.join(", ")}. ${remediation}`,
  );
}

function environmentKeys(
  env: EnvironmentSnapshot,
  keys: readonly string[],
  normalize: (key: string) => string,
): ReadonlyMap<string, boolean> | undefined {
  const facts = new Map<string, boolean>();
  const canonical = new Map(keys.map((key) => [key.toLowerCase(), key]));
  for (const name of Object.keys(env.variables)) {
    const key = canonical.get(normalize(name).toLowerCase());
    if (key === undefined) continue;
    if (facts.has(key)) return undefined;
    facts.set(key, (env.variables[name]?.trim().length ?? 0) > 0);
  }
  return facts;
}

function projectConfigFile<T>(
  path: string,
  project: (source: string) => T | undefined,
): Effect.Effect<T | null | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const metadata = yield* inspectPath(path);
    if (metadata.kind === "missing") return null;
    if (metadata.kind !== "file") return undefined;
    const actual = yield* canonicalPath(path);
    if (actual === undefined || !samePath(actual, path)) return undefined;
    const files = yield* ReadOnlyFiles;
    const data = yield* files.readBytesBounded(actual, MAX_MANIFEST_BYTES);
    return yield* Effect.try(() => project(new TextDecoder("utf-8", {fatal: true}).decode(data)));
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function inspectAppHostConfig(root: string, env: EnvironmentSnapshot): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const remediation = "See the user-scoped Setup action dotnet.user-secrets.set; no secret values were returned.";
    const blocked = capability(
      "apphost-config",
      false,
      "",
      `Worktree preparation: could not determine the effective AppHost Development parameter keys. ${remediation}`,
    );
    const hostDir = win32.join(root, "tooling/src/AppHost");
    const project = yield* readManifest(win32.join(root, appHost));
    const ids = [...project.matchAll(/<UserSecretsId>([a-z0-9][a-z0-9.-]*)<\/UserSecretsId>/giu)];
    const id = ids.length === 1 ? ids[0]?.[1] : undefined;
    const launch = record(parseJson(yield* readManifest(win32.join(hostDir, "Properties/launchSettings.json"))));
    const profiles = record(launch?.["profiles"]);
    const first = record(Object.values(profiles ?? {})[0]);
    const variables = record(first?.["environmentVariables"]);
    const redirectsConfig = (key: string) => /^(?:Parameters(?::|__)|(?:ASPNETCORE_|DOTNET_)?CONTENTROOT$)/iu.test(key);
    if (
      first?.["commandName"] !== "Project"
      || variables?.["DOTNET_ENVIRONMENT"] !== "Development"
      || variables["ASPNETCORE_ENVIRONMENT"] !== "Development"
      || (Object.hasOwn(first, "commandLineArgs") && first["commandLineArgs"] !== "")
      || (Object.hasOwn(first, "workingDirectory") && first["workingDirectory"] !== "")
      || Object.keys(variables).some(
        (key) => redirectsConfig(key) || (/^(?:DOTNET|ASPNETCORE)_ENVIRONMENT$/iu.test(key) && key !== key.toUpperCase()),
      )
      || Object.keys(env.variables).some((key) => /^(?:(?:ASPNETCORE_|DOTNET_)?CONTENTROOT)$/iu.test(key))
    )
      return blocked;
    const appData = env.variables["APPDATA"];
    if (id === undefined || !localDrivePath(appData)) return blocked;
    const environment = environmentKeys(env, parameters, (name) => name.replaceAll("__", ":"));
    const sources = yield* Effect.all([
      projectConfigFile(win32.join(appData, "Microsoft/UserSecrets", id, "secrets.json"), projectAppHostParameterKeys),
      projectConfigFile(win32.join(hostDir, "appsettings.Development.json"), projectAppHostParameterKeys),
      projectConfigFile(win32.join(hostDir, "appsettings.json"), projectAppHostParameterKeys),
    ]);
    if (!environment || sources.some((source) => source === undefined)) return blocked;
    return keyEvidence("apphost-config", parameters, [environment, ...sources.filter((source) => source != null)], remediation);
  });
}

function projectWebsiteKeys(source: string): ReadonlyMap<string, boolean> | undefined {
  const facts = new Map<string, boolean>();
  const expandable = new Set<string>();
  // Match dotenv declarations, including unrelated quoted multiline values, without executing
  // Next's process.env-mutating loader. Backslashes in ordinary Windows paths are literal.
  const declarations =
    /^[ \t]*(?:export[ \t]+)?([\w.-]+)(?:[ \t]*=|:[ \t]+)[ \t]*("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|`(?:\\`|[^`])*`|[^#\r\n]*?)[ \t]*(?:#.*)?$/gmu;
  for (const [, key, raw] of source.replaceAll(/\r\n?/gu, "\n").matchAll(declarations)) {
    if (key === undefined || !integrationKeys.includes(key)) continue;
    const text = raw?.trim() ?? "";
    const quote = text[0];
    const quoted = text.length >= 2 && (quote === '"' || quote === "'" || quote === "`") && text.endsWith(quote);
    const value = quoted ? text.slice(1, -1) : text;
    if (value.includes("$")) expandable.add(key);
    else expandable.delete(key);
    facts.set(key, (quote === '"' && quoted ? value.replaceAll(/\\[nr]/gu, "\n") : value).trim().length > 0);
  }
  return expandable.size === 0 ? facts : undefined;
}

function inspectWebsiteConfig(paths: RepositoryPaths, env: EnvironmentSnapshot): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const remediation = "See Setup action react.environment.write; no credential values were returned.";
    const blocked = capability(
      "website-config",
      false,
      "",
      `Worktree preparation: the effective Next development environment could not be projected. ${remediation}`,
    );
    const nodeEnv = Object.keys(env.variables).find((key) => key.toLowerCase() === "node_env");
    if (nodeEnv !== undefined && env.variables[nodeEnv] !== "development") return blocked;
    const environment = environmentKeys(env, integrationKeys, (name) => name);
    const sources = yield* Effect.forEach([".env.development.local", ".env.local", ".env.development", ".env"], (file) =>
      projectConfigFile(win32.join(paths.websiteRoot, file), projectWebsiteKeys),
    );
    if (!environment || sources.some((source) => source === undefined)) return blocked;
    return keyEvidence("website-config", integrationKeys, [environment, ...sources.filter((source) => source != null)], remediation);
  });
}

function inspectExpConfig(paths: RepositoryPaths): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const required = yield* projectConfigFile(win32.join(paths.expRoot, "config.template.json"), projectExpTypes);
    const local = yield* projectConfigFile(win32.join(paths.expRoot, "config.docker.json"), projectExpTypes);
    // The checked-in template uses scalar strings; null endpoints are skipped by ExpConfigGenerator.
    const compatible =
      !!required?.size
      && !!local
      && [...required].every(([key, type]) => (type === "string" || type === "boolean" || type === "number") && local.get(key) === type);
    return capability(
      "exp-config",
      compatible,
      "The checkout-owned exp config.docker.json contains the required non-null, compatible template entries; provider behavior was not verified.",
      "Worktree preparation: exp config.docker.json is missing, malformed, not checkout-owned, or lacks compatible required template entries. See the config.template.json instructions in ExpConfigGenerator.",
    );
  });
}

function projectExpTypes(source: string): ReadonlyMap<string, string> | undefined {
  const keys = parseConfigurationObject(source);
  const parsed = record(parseJson(source));
  if (!keys || !parsed) return undefined;
  return new Map(keys.map((key) => [key, typeof parsed[key]]));
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

function inspectSwc(
  root: string,
  architecture: string,
  version: string,
  packages: Readonly<Record<string, unknown>>,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    if (machineType(architecture) === undefined) return false;
    const suffix = `win32-${architecture}-msvc`;
    const name = `@next/swc-${suffix}`;
    const filename = `next-swc.${suffix}.node`;
    const next = win32.join(root, "node_modules/next");
    const manifest = record(parseJson(yield* readManifest(win32.join(next, "package.json"))));
    if (record(manifest?.["optionalDependencies"])?.[name] !== version) return false;
    // Next resolves a nested package before its hoisted sibling, then looks in its own local fallback cache.
    for (const [prefix, locked] of [
      ["node_modules/next/node_modules", true],
      ["node_modules", true],
      ["node_modules/next/next-swc-fallback", false],
    ] as const) {
      const location = `${prefix}/${name}`;
      const directory = win32.join(root, location);
      const candidate = record(parseJson(yield* readManifest(win32.join(directory, "package.json"))));
      if (
        candidate?.["name"] === name
        && candidate["version"] === version
        && candidate["main"] === filename
        && (!locked || record(packages[location])?.["version"] === version)
        && (yield* inspectPayload(root, win32.join(directory, filename), architecture, "swc"))
      )
        return true;
      if (locked && (yield* inspectPath(directory)).kind !== "missing") return false;
    }
    return false;
  }).pipe(Effect.orElseSucceed(() => false));
}

function inspectNpm(
  root: string,
  architecture: string,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const blocked = capability(
      "npm-dependencies",
      false,
      "",
      "Worktree preparation: the checkout-owned npm lockfile install was not verified. See Setup phase workspace.root-dependencies and the root npm ci prerequisite (separate approval).",
    );
    if (["node_path", "next_test_native_dir", "next_test_native_ignore_local_install", "next_swc_path"].some((key) => names.has(key)))
      return blocked;
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
    if (!(yield* inspectSwc(root, architecture, lockedNext["version"], packages))) {
      return capability(
        "npm-dependencies",
        false,
        "",
        "Worktree preparation: the applicable checkout-local Next SWC native binding was not verified. See Setup phase workspace.root-dependencies and the root npm ci prerequisite (separate approval).",
      );
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
          "Required npm manifests and workspace links match this checkout's lockfile, and its applicable Next SWC binding was observed without execution.",
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
        const spec = /^([a-z0-9][a-z0-9_.-]*)\s*(==|~=)\s*(\S+)$/iu.exec(line);
        const [, name, operator, expected] = spec ?? [];
        if (!name || !expected || (operator !== "==" && operator !== "~=")) return false;
        const prefix = `${name.toLowerCase().replaceAll(/[-_.]+/gu, "_")}-`;
        const candidates = entries.filter((entry) => entry.toLowerCase().startsWith(prefix) && entry.endsWith(".dist-info"));
        const [entry] = candidates;
        if (candidates.length !== 1 || entry === undefined) return false;
        const version = entry.slice(prefix.length, -".dist-info".length);
        return matchesLocalPythonPin(operator, expected, version) && (yield* ownedFile(win32.join(packages, entry, "METADATA")));
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

const ASSET_GROUPS = [
  "compile",
  "runtime",
  "native",
  "resource",
  "build",
  "buildMultiTargeting",
  "buildTransitive",
  "contentFiles",
  "runtimeTargets",
];
const ARTIFACT_PATH = /^(?:[a-z0-9_][a-z0-9_.+@-]*\/)*[a-z0-9_][a-z0-9_.+@-]*$/iu;
const NUGET_DIGEST = /^[a-z0-9+/]{86}==$/iu;

function inspectRestoreProject(root: string, project: string, checked: Map<string, boolean>): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const directory = win32.dirname(project);
    const assets = record(parseJson(yield* readManifest(win32.join(directory, "obj/project.assets.json"))));
    const restore = record(record(assets?.["project"])?.["restore"]);
    const declaredProject = restore?.["projectPath"];
    const targets = record(assets?.["targets"]);
    const libraries = record(assets?.["libraries"]);
    const groups = record(assets?.["projectFileDependencyGroups"]);
    const folders = Object.keys(record(assets?.["packageFolders"]) ?? {});
    if (
      (assets?.["version"] !== 3 && assets?.["version"] !== 4)
      || typeof declaredProject !== "string"
      || !samePath(declaredProject, project)
      || !(yield* ownedFile(project))
      || !targets
      || Object.keys(targets).length === 0
      || !libraries
      || !groups
      || Object.keys(groups).length === 0
      || folders.length === 0
      || !folders.every(localDrivePath)
    )
      return false;

    const referenced = new Map<string, Set<string>>();
    for (const [targetName, data] of Object.entries(targets)) {
      const target = record(data);
      if (!target || !Object.hasOwn(groups, targetName.split("/")[0] ?? "")) return false;
      for (const [name, entry] of Object.entries(target)) {
        const library = record(libraries[name]);
        const targetEntry = record(entry);
        if (!library || !targetEntry || library["type"] !== targetEntry["type"]) return false;
        if (library["type"] === "project") {
          const path = library["msbuildProject"];
          if (typeof path !== "string") return false;
          const linked = win32.resolve(directory, path);
          const relative = win32.relative(root, linked);
          if (relative === ".." || relative.startsWith("..\\") || win32.isAbsolute(relative) || !(yield* ownedFile(linked))) return false;
          continue;
        }
        if (library["type"] !== "package") return false;
        const artifacts = referenced.get(name) ?? new Set<string>();
        referenced.set(name, artifacts);
        for (const key of ASSET_GROUPS) {
          if (!Object.hasOwn(targetEntry, key)) continue;
          const group = record(targetEntry[key]);
          if (!group) return false;
          for (const file of Object.keys(group)) {
            if (!ARTIFACT_PATH.test(file)) return false;
            if (file.split("/").at(-1) !== "_._") artifacts.add(file);
          }
        }
      }
    }

    if (samePath(project, win32.join(root, appHost)) && referenced.size === 0) return false;
    for (const [name, value] of Object.entries(libraries)) {
      const library = record(value);
      if (library?.["type"] === "project") continue;
      const path = library?.["path"];
      const hash = library?.["sha512"];
      const id = name.split("/")[0]?.toLowerCase();
      if (
        library?.["type"] !== "package"
        || typeof path !== "string"
        || !ARTIFACT_PATH.test(path)
        || path.toLowerCase() !== name.toLowerCase()
        || !id
        || typeof hash !== "string"
        || !NUGET_DIGEST.test(hash)
        || !referenced.has(name)
      )
        return false;
      const artifacts = [...(referenced.get(name) ?? [])].sort();
      const lookup = JSON.stringify([folders, path, hash, artifacts]);
      let verified = checked.get(lookup);
      if (verified === undefined) {
        verified = false;
        for (const folder of folders) {
          const packageDir = win32.join(folder, path);
          const observation = yield* inspectPath(packageDir).pipe(Effect.orElseSucceed(() => undefined));
          if (observation?.kind === "missing") continue;
          if (observation?.kind !== "directory") break;
          const contentHash = yield* projectConfigFile(win32.join(packageDir, ".nupkg.metadata"), (text) => {
            const value = record(parseJson(text))?.["contentHash"];
            return typeof value === "string" ? value : undefined;
          });
          const packageHash = (yield* readManifest(win32.join(packageDir, `${path.replace("/", ".")}.nupkg.sha512`))).trim();
          // NuGet uses the first match; do not borrow missing payloads from other folders.
          const hasManifest = yield* ownedFile(win32.join(packageDir, `${id}.nuspec`));
          const files = yield* Effect.forEach(artifacts, (file) => ownedFile(win32.join(packageDir, file)), {concurrency: 16});
          // The assets graph records the extracted package's content hash, not the archive digest.
          verified = contentHash === hash && NUGET_DIGEST.test(packageHash) && hasManifest && files.every(Boolean);
          break;
        }
        checked.set(lookup, verified);
      }
      if (!verified) return false;
    }
    return true;
  });
}

function inspectToolPayload(
  root: string,
  toolDir: string,
  architecture: string,
  framework: string,
  pin: string,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const settings = yield* readManifest(win32.join(toolDir, "DotnetToolSettings.xml"));
    const commands = [...settings.matchAll(/<Command\s+([^>]+?)\/?>/gu)];
    const attrs = new Map([...(commands[0]?.[1] ?? "").matchAll(/(\w+)\s*=\s*"([^"]+)"/gu)].map(([, key, value]) => [key, value]));
    const path = attrs.get("EntryPoint");
    const runner = attrs.get("Runner");
    if (commands.length !== 1 || attrs.get("Name") !== "aspire" || !path || !/^aspire(?:\.cli)?\.(?:dll|exe)$/iu.test(path)) return false;
    const entry = win32.join(toolDir, path);
    if (runner === "dotnet" && path.toLowerCase().endsWith(".dll")) {
      const stem = entry.slice(0, -".dll".length);
      const runtime = record(parseJson(yield* readManifest(`${stem}.runtimeconfig.json`)));
      const deps = record(parseJson(yield* readManifest(`${stem}.deps.json`)));
      const targets = record(deps?.["targets"]);
      if (
        record(runtime?.["runtimeOptions"])?.["tfm"] !== framework
        || !targets
        || !Object.values(targets).some((value) =>
          Object.keys(record(value) ?? {}).some(
            (key) => key.toLowerCase() === `aspire.cli/${pin}` || key.toLowerCase() === `aspire/${pin}`,
          ),
        )
      )
        return false;
      return yield* inspectPayload(root, entry, architecture, "cli", pin);
    }
    return (
      runner === "executable"
      && path.toLowerCase().endsWith(".exe")
      && (yield* inspectPayload(root, entry, architecture, "cli-native", pin))
    );
  });
}

function selectedVariable(env: EnvironmentSnapshot, name: string): string | undefined {
  const keys = Object.keys(env.variables).filter((key) => key.toLowerCase() === name);
  const [key] = keys;
  return keys.length === 1 && key !== undefined ? env.variables[key] : undefined;
}

function pinnedBundleRoot(layout: string, pin: string): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  const pinnedDirectory = new RegExp(`^${pin.replaceAll(".", "\\.")}(?:_[0-9a-f]{7,64}(?:-[0-9a-f]{7,64})?)?$`, "iu");
  return Effect.gen(function* () {
    const root = yield* canonicalPath(layout);
    if (root === undefined || !samePath(root, layout)) return undefined;
    // Installed 13.6.5 resolver tries the layout itself, its bundle child, then its versions.
    // Recognize only unambiguous local layouts; do not skip a partial/unsupported higher-priority one.
    for (const candidate of [root, win32.join(root, "bundle")]) {
      const metadata = yield* inspectPath(candidate);
      if (metadata.kind === "missing") continue;
      if (metadata.kind !== "directory") return undefined;
      if (samePath(candidate, root)) {
        const parts = yield* Effect.forEach(["dcp", "managed", "dashboard"], (name) => inspectPath(win32.join(root, name)));
        if (parts.every((part) => part.kind === "missing")) continue;
      }
      const canonical = yield* canonicalPath(candidate);
      if (canonical === undefined) return undefined;
      if (samePath(candidate, canonical)) return canonical;
      const destination = win32.relative(win32.join(root, "versions"), canonical);
      return pinnedDirectory.test(destination) ? canonical : undefined;
    }
    const versions = win32.join(root, "versions");
    const canonicalVersions = yield* canonicalPath(versions);
    if (canonicalVersions === undefined || !samePath(canonicalVersions, versions)) return undefined;
    const files = yield* ReadOnlyFiles;
    const entries = yield* files.readDirectory(versions);
    const candidates = entries.filter((entry) => !/\.(?:tmp|old|bad)\./iu.test(entry));
    const [entry] = candidates;
    if (candidates.length !== 1 || entry === undefined || !pinnedDirectory.test(entry)) return undefined;
    const candidate = win32.join(versions, entry);
    const actual = yield* canonicalPath(candidate);
    return actual !== undefined && samePath(actual, candidate) ? actual : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function inspectPinnedBundle(
  root: string,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
  project: string,
  pin: string,
  framework: string,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    // This layout was read from the installed 13.6.5 SDK. Other resolver/profile contracts need separate evidence.
    const unsupported = [
      "aspireclipath",
      "aspirecliinvocationmode",
      "aspireuseclibundle",
      "aspirehostingsdkversion",
      "dcpdir",
      "aspiredashboarddir",
      "aspiredashboardpath",
      "aspireterminalhostdir",
      "aspireterminalhostpath",
      "aspireterminalhostinvocationargs",
      "_aspireclisetuphome",
      "msbuildsdkspath",
      "directorybuildpropspath",
      "directorybuildtargetspath",
      "msbuildprojectextensionspath",
      "dotnet_cli_home",
      "custombeforemicrosoftcommontargets",
      "customaftermicrosoftcommontargets",
    ];
    if (pin !== "13.6.5" || unsupported.some((name) => names.has(name)) || machineType(env.architecture) === undefined) return false;
    const app = project.replaceAll(/<!--[\s\S]*?-->/gu, "");
    const settings = [...app.matchAll(/<PropertyGroup>\s*([\s\S]*?)<\/PropertyGroup>/gu)].map(([, group]) => group ?? "");
    if (
      !settings.some(
        (group) =>
          group.includes("<AspireUseCliBundle>true</AspireUseCliBundle>")
          && group.includes("<AspireCliInvocationMode>DnxPinned</AspireCliInvocationMode>"),
      )
      || (app.match(/<AspireUseCliBundle\b/giu)?.length ?? 0) !== 1
      || (app.match(/<AspireCliInvocationMode\b/giu)?.length ?? 0) !== 1
      || /<(?:Import|Choose|AspireCliBundlePath|AspireCliPath|DcpDir|AspireDashboardDir|AspireDashboardPath|AspireHostingSDKVersion)\b/iu.test(
        app,
      )
      || !/<PackageReference Include="Aspire\.Hosting\.AppHost"\s*\/>/u.test(app)
    )
      return false;
    // The resolver assembly is supplied by the Hosting.AppHost package, not just the SDK declaration.
    const pins = yield* readManifest(win32.join(root, "tooling/Directory.Packages.props"));
    if (
      !/<PackageVersion Include="Aspire\.Hosting\.AppHost" Version="13\.6\.5"\s*\/>/u.test(pins)
      || (pins.match(/<PackageVersion\b[^>]*(?:Include|Update)="Aspire\.Hosting\.AppHost"/giu)?.length ?? 0) !== 1
    )
      return false;
    const explicit = selectedVariable(env, "aspireclibundlepath");
    const aspireHome = selectedVariable(env, "aspire_home");
    const nuget = selectedVariable(env, "nuget_packages");
    if (
      (names.has("aspireclibundlepath") && !localDrivePath(explicit))
      || (names.has("aspire_home") && !localDrivePath(aspireHome))
      || (names.has("nuget_packages") && !localDrivePath(nuget))
    )
      return false;
    let profile: string | undefined;
    if ((explicit === undefined && aspireHome === undefined) || nuget === undefined) {
      const outcome = yield* run(probes.infrastructure.windowsUserProfile(), {cwd: root});
      profile = outcome.kind === "succeeded" ? outcome.stdout.trim() : undefined;
      const claimed = selectedVariable(env, "userprofile");
      if (!localDrivePath(profile) || (names.has("userprofile") && (!claimed || !samePath(profile, claimed)))) return false;
    }
    const layout = explicit ?? aspireHome ?? win32.join(profile ?? "", ".aspire");
    const cache = nuget ?? win32.join(profile ?? "", ".nuget/packages");
    const directory = yield* pinnedBundleRoot(layout, pin);
    if (!directory) return false;

    const cliDir = win32.join(cache, "aspire.cli", pin);
    const sdkDir = win32.join(cache, "aspire.apphost.sdk", pin, "Sdk");
    const meta = yield* readManifest(win32.join(cliDir, "aspire.cli.nuspec"));
    if (
      !/<id>\s*aspire\.cli\s*<\/id>/iu.test(meta)
      || /<version>\s*([^<]+?)\s*<\/version>/u.exec(meta)?.[1] !== pin
      || !(yield* ownedFile(win32.join(cliDir, ".nupkg.metadata")))
      || !(yield* ownedFile(win32.join(sdkDir, "Sdk.targets")))
      || !(yield* ownedFile(win32.join(sdkDir, "Sdk.props")))
    )
      return false;
    const toolRoots = [win32.join(cliDir, "tools", framework, `win-${env.architecture}`), win32.join(cliDir, "tools", framework, "any")];
    const tools = yield* Effect.forEach(toolRoots, (path) => inspectPath(path));
    const candidates = toolRoots.filter((_, index) => tools[index]?.kind === "directory");
    const [tool] = candidates;
    if (
      candidates.length !== 1
      || tool === undefined
      || !(yield* inspectToolPayload(root, tool, env.architecture, framework, pin))
      || !(yield* ownedFile(win32.join(directory, "dcp/dcptun_c")))
    )
      return false;
    const observations = yield* Effect.all(
      [
        inspectPayload(root, win32.join(directory, "dcp/dcp.exe"), env.architecture, "dcp"),
        inspectPayload(root, win32.join(directory, "managed/aspire-managed.exe"), env.architecture, "managed", pin),
        inspectPayload(root, win32.join(directory, "dashboard/Aspire.Dashboard.exe"), env.architecture, "dashboard", pin),
      ],
      {concurrency: "unbounded"},
    );
    return observations.every(Boolean);
  }).pipe(Effect.orElseSucceed(() => false));
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
    const checked = new Map<string, boolean>();
    let appHostObserved = false;
    const solution = yield* inspectSolution(paths, (project) => {
      if (samePath(project, win32.join(paths.root, appHost))) appHostObserved = true;
      return inspectRestoreProject(paths.root, project, checked);
    });
    const assets = appHostObserved && solution.issues.length === 0 && solution.restoreIssues.length === 0;
    // NuGet's dgSpecHash covers the evaluated graph, not the current project/import contents.
    // There is no authoritative offline input fingerprint to compare here. Never infer freshness
    // from old files, paths or timestamps, or run MSBuild/restore to generate new evidence.
    const bundle = !!(
      pin
      && sdk
      && framework
      && (yield* inspectPinnedBundle(paths.root, env, names, project, pin, `net${framework[1]}.${framework[2]}`))
    );
    return [
      capability(
        "dotnet-sdk",
        sdk,
        "A stable SDK for the tooling target framework is listed.",
        "Machine bootstrap: the required .NET SDK was not observed. See Setup action dotnet.install-sdk.",
      ),
      capability(
        "nuget-assets",
        false,
        "",
        assets
          ? "Worktree preparation: local NuGet artifacts were observed, but restore freshness cannot be established against current project and central inputs without authoritative evidence."
          : "Worktree preparation: solution restore artifacts could not be verified. See Setup action dotnet.solution-restore.",
      ),
      capability(
        "aspire-bundle",
        bundle,
        "The pinned DNX CLI and selected Aspire-home or explicit Windows Dashboard, managed runtime and DCP payloads were observed without execution.",
        "Machine bootstrap: the pinned DNX CLI or selected Windows bundle could not be verified. See tooling/README.md (Development and debugging) for separately approved bundle preparation.",
      ),
    ];
  });
}

/**
 * Inspects an attached, canonical Windows worktree and its bounded local prerequisites.
 * Configuration is projected to key facts in-process; no setup, trust mutation, or launch is performed.
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
        inspectNpm(root, env.architecture, names),
        inspectWebsiteArtifacts(root),
        inspectPython(paths),
        inspectExpConfig(paths),
      ],
      {concurrency: "unbounded"},
    );
    const capabilities = [
      capability("checkout", true, "Canonical, attached linked-worktree identity was observed.", ""),
      ...(yield* Effect.all([inspectAppHostConfig(root, env), inspectWebsiteConfig(paths, env)], {concurrency: "unbounded"})),
      ...checks,
      ...(yield* inspectBundle(paths, env, names)),
    ];
    return {status: capabilities.every((entry) => entry.status === "pass") ? "prepared" : "blocked", checkout, capabilities};
  });
}
