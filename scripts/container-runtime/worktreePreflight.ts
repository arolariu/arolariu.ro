/**
 * @fileoverview Read-only checkout, engine and host prerequisite evidence for an Aspire worktree.
 * @module scripts/container-runtime/worktreePreflight
 */

import {createHash} from "node:crypto";
import {posix, win32} from "node:path";

import {Effect, Option} from "effect";

import {describeGitCheckout} from "../commands/doctor/modules/workspace.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {
  inspectSolution,
  projectAppHostParameterKeys,
  readBuildProjectXml,
  readDotnetToolSettingsXml,
  type BuildXmlElement,
} from "../inspection/dotnet.ts";
import {inspectPath} from "../inspection/files.ts";
import {inspectionProbeRunner, probes} from "../inspection/probes.ts";
import {matchesLocalPythonPin, parseConfigurationObject} from "../inspection/python.ts";
import {currentWorktreeRestoreEvidence, isUnmodeledBuildFileSelector, worktreeRestoreRemediation} from "../inspection/worktreeRestore.ts";
import {Environment, type EnvironmentSnapshot} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import {Process} from "../platform/Process.ts";
import type {ContainerEngine} from "./types.ts";

/** Input for scoped prerequisite inspection. */
export interface WorktreePreflightInput {
  readonly expectedRoot?: string;
  readonly engine: ContainerEngine;
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

function pathProfile(platform: NodeJS.Platform) {
  const windows = platform === "win32";
  const paths = windows ? win32 : posix;
  const key = (path: string): string => {
    const normalized = paths.normalize(path);
    return windows ? normalized.toLowerCase() : normalized;
  };
  const isLocal = (path: string | undefined): path is string =>
    windows ? localDrivePath(path) : path !== undefined && /^\/(?!\/)[^\u0000-\u001f\u007f]*$/u.test(path);
  return {paths, key, isLocal, equal: (left: string, right: string): boolean => key(left) === key(right)};
}

function localDrivePath(path: string | undefined): path is string {
  return path !== undefined && /^[a-z]:[\\/][^\u0000-\u001f]*$/iu.test(path);
}

const samePath = pathProfile("win32").equal;

function isWorktreePlatform(platform: NodeJS.Platform): boolean {
  return platform === "win32" || platform === "linux" || platform === "darwin";
}

function canonicalPath(path: string): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.realPath(path)).pipe(Effect.orElseSucceed(() => undefined));
}

// Disallow redirection through a junction/symlink. The checkout itself has already been canonicalized.
function ownedFile(path: string, equal = samePath): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const canonical = yield* canonicalPath(path);
    if (canonical === undefined || !equal(canonical, path)) return false;
    const files = yield* ReadOnlyFiles;
    const info = yield* files.stat(canonical);
    return info.type === "File" && info.size > 0;
  }).pipe(Effect.orElseSucceed(() => false));
}

function readManifest(path: string, equal = samePath): Effect.Effect<string, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (!(yield* ownedFile(path, equal))) return "";
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

type CompanionRole = "managed-library" | "native-library" | "native-executable";
type PayloadRole = "cli" | "cli-native" | "dcp" | "managed" | "dashboard" | "swc" | CompanionRole;

function inspectPayload(
  root: string,
  path: string,
  architecture: string,
  role: PayloadRole,
  version = "",
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    if (!(yield* isPortableExecutable(path, architecture, role === "cli" || role === "managed-library"))) return false;
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
  expectedRoot: string | undefined,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreeCheckout | undefined, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    if (["git_dir", "git_work_tree", "git_common_dir", "git_namespace"].some((key) => names.has(key))) return undefined;
    const {paths, equal, isLocal} = pathProfile(env.platform);
    const root = yield* canonicalPath(env.cwd);
    if (!isLocal(root)) return undefined;
    if (expectedRoot !== undefined) {
      const expected = yield* canonicalPath(paths.resolve(env.cwd, expectedRoot));
      if (expected === undefined || !equal(expected, root)) return undefined;
    }

    // Clear case variants from the inherited Windows environment. Explicitly disable
    // Trace2 targets so Git cannot fall back to file-backed system/user config.
    const gitOptions = {
      cwd: root,
      env: {
        ...Object.fromEntries(
          Object.keys(env.variables)
            .filter((key) => /^git_trace/iu.test(key))
            .map((key) => [key, undefined]),
        ),
        GIT_TRACE2: "0",
        GIT_TRACE2_EVENT: "0",
        GIT_TRACE2_PERF: "0",
      },
    };
    const metadata = yield* run(probes.workspace.gitCheckout(), gitOptions);
    if (metadata.kind !== "succeeded") return undefined;
    const checkout = yield* describeGitCheckout(metadata.stdout, root, env.platform);
    if (checkout?.kind !== "linked-worktree" || !isLocal(checkout.commonDirectory)) return undefined;
    const manifest = yield* readManifest(paths.join(root, "package.json"), equal);
    if (record(parseJson(manifest))?.["name"] !== "@arolariu/monorepo") return undefined;

    const branch = yield* run(probes.workspace.gitBranch(), gitOptions);
    const head = yield* run(probes.workspace.gitHead(), gitOptions);
    if (branch.kind !== "succeeded" || head.kind !== "succeeded") return undefined;
    const ref = branch.stdout.replace(/\r?\n$/u, "");
    const branchPrefix = "refs/heads/";
    const branchName = ref.startsWith(branchPrefix) ? ref.slice(branchPrefix.length) : "";
    const hash = head.stdout.trimEnd();
    if (!branchName || /[\p{C}\p{Zl}\p{Zp} \ufffd]/u.test(branchName) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(hash)) return undefined;
    const listing = yield* run(probes.workspace.gitWorktreeList(), gitOptions);
    if (listing.kind !== "succeeded" || !listing.stdout.endsWith("\0\0")) return undefined;
    const registrations = listing.stdout.split("\0\0").map((entry) => entry.split("\0"));
    const matches = registrations.filter(([path]) => path?.startsWith("worktree ") && equal(path.slice(9), root));
    const [registration] = matches;
    const registeredHeads = registration?.filter((entry) => entry.startsWith("HEAD "));
    const registeredBranches = registration?.filter((entry) => entry.startsWith("branch "));
    if (
      matches.length !== 1
      || !registration
      || registeredHeads?.length !== 1
      || registeredHeads[0] !== `HEAD ${hash}`
      || registeredBranches?.length !== 1
      || registeredBranches[0] !== `branch ${ref}`
      || registration.some((entry) => /^(?:bare|detached|prunable)(?: |$)/u.test(entry))
    )
      return undefined;
    return {root, commonGitDir: checkout.commonDirectory, branch: branchName, head: hash};
  });
}

/** Re-observes the current linked checkout without launching or preparing any provider. */
export function observeWorktreeCheckout(): Effect.Effect<WorktreeCheckout | undefined, never, Environment | ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const env = yield* Environment;
    if (!isWorktreePlatform(env.platform)) return undefined;
    return yield* observeCheckout(undefined, env, new Set(Object.keys(env.variables).map((name) => name.toLowerCase())));
  });
}

type PodmanRegistration = {readonly uri: string; readonly identity: string; readonly fingerprint: string};

function registeredPodmanConnection(
  root: string,
  name: string,
  uri: string,
  identity: string,
  platform: NodeJS.Platform,
): Effect.Effect<PodmanRegistration | undefined, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {paths, equal, key, isLocal} = pathProfile(platform);
    const endpoint = URL.parse(uri);
    if (endpoint === null) return undefined;
    const port = Number(endpoint.port);
    const listing = yield* run(probes.infrastructure.podmanMachineList(), {cwd: root});
    const machines = listing.kind === "succeeded" ? parseJson(listing.stdout) : undefined;
    if (!Array.isArray(machines)) return undefined;
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
      return undefined;
    const user = candidate["RemoteUsername"];
    const listedIdentity = candidate["IdentityPath"];
    if (
      candidate["Port"] !== port
      || typeof user !== "string"
      || !/^[a-z0-9_.-]+$/iu.test(user)
      || typeof listedIdentity !== "string"
      || !equal(identity, listedIdentity)
    )
      return undefined;
    const sshMatches = (ssh: Readonly<Record<string, unknown>> | undefined): boolean => {
      const path = ssh?.["IdentityPath"];
      return ssh?.["Port"] === port && ssh["RemoteUsername"] === user && typeof path === "string" && equal(path, identity);
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
      || !isLocal(configDir)
    )
      return undefined;

    // Machine inspect describes SSH but not the guest UID needed to identify the rootless socket.
    const document = record(parseJson(yield* readManifest(paths.join(configDir, `${machine}.json`), equal)));
    const hostUser = record(document?.["HostUser"]);
    const uid = hostUser?.["UID"];
    if (
      document?.["Name"] !== machine
      || hostUser?.["Rootful"] !== rootful
      || !sshMatches(record(document["SSH"]))
      || (!rootful && (typeof uid !== "number" || !Number.isSafeInteger(uid) || uid < 1))
    )
      return undefined;
    const expectedName = rootful ? `${machine}-root` : machine;
    const socket = rootful ? "/run/podman/podman.sock" : `/run/user/${String(uid)}/podman/podman.sock`;
    if (
      name !== expectedName
      || uri !== `ssh://${rootful ? "root" : user}@127.0.0.1:${port}${socket}`
      || !(yield* ownedFile(identity, equal))
    ) {
      return undefined;
    }
    const created = selected["Created"];
    const canonical = yield* canonicalPath(configDir);
    if (
      typeof created !== "string"
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)$/u.test(created)
      || !Number.isFinite(Date.parse(created))
      || created.startsWith("0001-")
      || canonical === undefined
      || !equal(canonical, configDir)
    )
      return undefined;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([name, uri, key(identity), key(canonical), created]))
      .digest("hex");
    return {uri, identity, fingerprint};
  });
}

function hasPodmanOverrides(names: ReadonlySet<string>): boolean {
  return [
    "container_host",
    "container_connection",
    "container_sshkey",
    "containers_conf",
    "containers_conf_override",
    "podman_connections_conf",
  ].some((key) => names.has(key));
}

function observePodmanRegistration(
  root: string,
  names: ReadonlySet<string>,
  platform: NodeJS.Platform,
): Effect.Effect<PodmanRegistration | "overrides" | undefined, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (hasPodmanOverrides(names)) return "overrides" as const;
    const {isLocal} = pathProfile(platform);
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
      || !isLocal(identity)
    ) {
      return undefined;
    }
    return yield* registeredPodmanConnection(root, name, uri, identity, platform);
  });
}

/** Fingerprints the local backend registration without exposing engine routing or credentials. */
export function observeWorktreeEngine(
  checkout: WorktreeCheckout,
  engine: ContainerEngine = "podman",
): Effect.Effect<string | undefined, never, Environment | Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const env = yield* Environment;
    const names = new Set(Object.keys(env.variables).map((key) => key.toLowerCase()));
    if (engine === "rancher" && isWorktreePlatform(env.platform)) {
      const observed = yield* observeRancherBackend(checkout.root, names, env);
      return "fingerprint" in observed ? observed.fingerprint : undefined;
    }
    if (env.platform === "linux") {
      const observed = yield* observeLinuxPodmanSocket(checkout.root, names, env);
      return "fingerprint" in observed ? observed.fingerprint : undefined;
    }
    if (env.platform !== "win32" && env.platform !== "darwin") return undefined;
    const registration = yield* observePodmanRegistration(checkout.root, names, env.platform);
    return typeof registration === "object" ? registration.fingerprint : undefined;
  });
}

/** Verified local transport for internal runtime dispatch only. Never include this object in preflight output. */
export interface WorktreeEngineBinding {
  readonly engine: ContainerEngine;
  readonly fingerprint: string;
  readonly environment: Readonly<Record<string, string>>;
}

/** Pins a responsive, verified x64 backend and its exact local runtime routing. */
export function bindWorktreeEngine(
  checkout: WorktreeCheckout,
  engine: ContainerEngine,
): Effect.Effect<WorktreeEngineBinding | undefined, never, Environment | Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const env = yield* Environment;
    if (!isWorktreePlatform(env.platform) || env.architecture !== "x64") return undefined;
    const names = new Set(Object.keys(env.variables).map((name) => name.toLowerCase()));
    if (engine === "rancher") {
      const observed = yield* observeRancherBackend(checkout.root, names, env);
      if ("reason" in observed) return undefined;
      return {
        engine,
        fingerprint: observed.fingerprint,
        environment: {DOCKER_HOST: observed.endpoint, ASPIRE_CONTAINER_RUNTIME: "docker", DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker"},
      };
    }

    if (env.platform === "linux") {
      const observed = yield* observeLinuxPodmanSocket(checkout.root, names, env);
      if ("reason" in observed) return undefined;
      return {
        engine,
        fingerprint: observed.fingerprint,
        environment: {CONTAINER_HOST: observed.endpoint, ASPIRE_CONTAINER_RUNTIME: "podman", DOTNET_ASPIRE_CONTAINER_RUNTIME: "podman"},
      };
    }

    const registered = yield* observePodmanRegistration(checkout.root, names, env.platform);
    if (typeof registered !== "object") return undefined;
    const routing = {CONTAINER_HOST: registered.uri, CONTAINER_SSHKEY: registered.identity};
    const response = yield* run(probes.infrastructure.runtimeInfo("podman"), {cwd: checkout.root, env: routing});
    if (response.kind !== "succeeded" || !isLinuxPodman(parseJson(response.stdout))) return undefined;
    const current = yield* observePodmanRegistration(checkout.root, names, env.platform);
    if (typeof current !== "object" || current.fingerprint !== registered.fingerprint) return undefined;
    return {
      engine,
      fingerprint: registered.fingerprint,
      environment: {...routing, ASPIRE_CONTAINER_RUNTIME: "podman", DOTNET_ASPIRE_CONTAINER_RUNTIME: "podman"},
    };
  });
}

function isEngineVersion(version: unknown): boolean {
  return typeof version === "string" && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/u.test(version);
}

function isLinuxPodman(info: unknown): boolean {
  const response = record(info);
  return (
    isEngineVersion(record(response?.["version"])?.["Version"])
    && record(response?.["host"])?.["os"] === "linux"
    && record(response?.["store"]) !== undefined
  );
}

function localUnixSocket(directory: string | undefined, path: string): string | undefined {
  if (!pathProfile("linux").isLocal(directory) || /[%?#]/u.test(directory)) return undefined;
  return `unix://${posix.join(directory, path)}`;
}

function linuxPodmanSocketIdentity(
  directory: string,
  socket: string,
  uid: number,
): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    if ((yield* canonicalPath(socket)) !== socket) return undefined;
    const files = yield* ReadOnlyFiles;
    const runtime = yield* files.stat(directory);
    const info = yield* files.stat(socket);
    const inode = Option.getOrUndefined(info.ino);
    if (
      runtime.type !== "Directory"
      || (runtime.mode & 0o077) !== 0
      || Option.getOrUndefined(runtime.uid) !== uid
      || info.type !== "Socket"
      || Option.getOrUndefined(info.uid) !== uid
      || inode === undefined
      || inode <= 0n
    )
      return undefined;
    return createHash("sha256")
      .update(JSON.stringify(["podman", socket, uid, String(info.dev), String(inode)]))
      .digest("hex");
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function observeLinuxPodmanSocket(
  root: string,
  names: ReadonlySet<string>,
  env: EnvironmentSnapshot,
): Effect.Effect<{readonly endpoint: string; readonly fingerprint: string} | {readonly reason: string}, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (hasPodmanOverrides(names)) return {reason: "Podman connection overrides are unsupported."};
    const directory = env.variables["XDG_RUNTIME_DIR"];
    const uid = env.effectiveUserId;
    const endpoint = localUnixSocket(directory, "podman/podman.sock");
    if (directory === undefined || posix.normalize(directory) !== directory || endpoint === undefined || uid === undefined || uid < 1) {
      return {reason: "Set a canonical XDG_RUNTIME_DIR and start the local rootless Podman API socket as the current user."};
    }
    const socket = endpoint.slice("unix://".length);
    const first = yield* linuxPodmanSocketIdentity(directory, socket, uid);
    if (first === undefined) return {reason: "The expected Podman socket is missing, redirected, or not private to the current user."};

    const response = yield* run(probes.infrastructure.podmanSocketInfo(), {cwd: root, env: {CONTAINER_HOST: endpoint}});
    const info = response.kind === "succeeded" ? parseJson(response.stdout) : undefined;
    if (!isLinuxPodman(info) || record(record(record(info)?.["host"])?.["security"])?.["rootless"] !== true) {
      return {reason: "The local Podman API socket did not return valid rootless Linux engine information."};
    }
    if ((yield* linuxPodmanSocketIdentity(directory, socket, uid)) !== first) {
      return {reason: "The local Podman socket changed during verification."};
    }
    return {endpoint, fingerprint: first};
  });
}

function inspectPodman(
  root: string,
  names: ReadonlySet<string>,
  env: EnvironmentSnapshot,
): Effect.Effect<WorktreeCapability, never, Process | ReadOnlyFiles> {
  return Effect.gen(function* () {
    const blocked = (detail: string) => capability("podman-backend", false, "", `Engine bootstrap: ${detail}`);
    if (env.platform === "linux") {
      const observed = yield* observeLinuxPodmanSocket(root, names, env);
      return "reason" in observed
        ? blocked(observed.reason)
        : capability("podman-backend", true, "The private local Podman socket returned structured rootless Linux engine information.", "");
    }

    const registration = yield* observePodmanRegistration(root, names, env.platform);
    if (registration === "overrides") {
      return blocked("Podman connection overrides are unsupported. Select the local Podman Desktop machine without overrides.");
    }
    if (registration === undefined) {
      return blocked("No pinned default local Podman machine was verified. See Podman Desktop in infra/Local/readme.md.");
    }
    const info = yield* run(probes.infrastructure.runtimeInfo("podman"), {
      cwd: root,
      env: {CONTAINER_HOST: registration.uri, CONTAINER_SSHKEY: registration.identity},
    });
    return capability(
      "podman-backend",
      info.kind === "succeeded" && isLinuxPodman(parseJson(info.stdout)),
      "The pinned local Podman machine returned structured Linux engine information.",
      "Machine bootstrap: the local Podman backend did not return valid engine information. Verify the selected Podman machine separately.",
    );
  });
}

function observeRancherBackend(
  root: string,
  names: ReadonlySet<string>,
  env: EnvironmentSnapshot,
): Effect.Effect<{readonly fingerprint: string; readonly endpoint: string} | {readonly reason: string}, never, Process> {
  return Effect.gen(function* () {
    const blocked = (reason: string) => ({reason});
    if (
      ["docker_host", "docker_context", "docker_config", "docker_tls", "docker_tls_verify", "docker_cert_path"].some((key) =>
        names.has(key),
      )
    ) {
      return blocked("Docker endpoint or configuration overrides are unsupported for scoped Rancher preflight.");
    }
    const endpoint =
      env.platform === "win32" ? "npipe:////./pipe/docker_engine" : localUnixSocket(env.variables["HOME"], ".rd/docker.sock");
    if (endpoint === undefined) return blocked("Set HOME to locate the local Rancher Desktop socket.");

    // The Windows pipe is shared by Docker-compatible products; a context name or Moby banner does not identify its owner.
    const guest = yield* run(probes.infrastructure.rancherGuestEngineId(), {cwd: root});
    const guestId = guest.kind === "succeeded" ? guest.stdout.trim() : "";
    if (!/^[a-z0-9][a-z0-9:-]{0,255}$/iu.test(guestId)) {
      return blocked("Could not verify a running Rancher Desktop Moby daemon via rdctl. Start Rancher Desktop in Moby mode separately.");
    }
    const local = yield* run(probes.infrastructure.rancherEngineInfo(), {cwd: root, env: {DOCKER_HOST: endpoint}});
    const info = local.kind === "succeeded" ? record(parseJson(local.stdout)) : undefined;
    if (info?.["ID"] !== guestId || info["OSType"] !== "linux" || !isEngineVersion(info["ServerVersion"])) {
      return blocked("The local Docker endpoint was unavailable or did not match the running Rancher Desktop Moby daemon.");
    }
    return {
      endpoint,
      fingerprint: createHash("sha256")
        .update(JSON.stringify(["rancher", endpoint, guestId]))
        .digest("hex"),
    };
  });
}

function inspectRancher(
  root: string,
  names: ReadonlySet<string>,
  env: EnvironmentSnapshot,
): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.map(observeRancherBackend(root, names, env), (observed) =>
    "fingerprint" in observed
      ? capability(
          "rancher-backend",
          true,
          "The pinned local Docker endpoint matches the Moby daemon in the running Rancher Desktop guest.",
          "",
        )
      : capability("rancher-backend", false, "", observed.reason),
  );
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
  ignoreCase = true,
): ReadonlyMap<string, boolean> | undefined {
  const facts = new Map<string, boolean>();
  const keyOf = (name: string): string => (ignoreCase ? name.toLowerCase() : name);
  const canonical = new Map(keys.map((key) => [keyOf(key), key]));
  for (const name of Object.keys(env.variables)) {
    const key = canonical.get(keyOf(normalize(name)));
    if (key === undefined) continue;
    if (facts.has(key)) return undefined;
    facts.set(key, (env.variables[name]?.trim().length ?? 0) > 0);
  }
  return facts;
}

function projectConfigFile<T>(
  path: string,
  project: (source: string) => T | undefined,
  equal = samePath,
): Effect.Effect<T | null | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const metadata = yield* inspectPath(path);
    if (metadata.kind === "missing") return null;
    if (metadata.kind !== "file") return undefined;
    const actual = yield* canonicalPath(path);
    if (actual === undefined || !equal(actual, path)) return undefined;
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
    const {paths, equal, isLocal} = pathProfile(env.platform);
    const hostDir = paths.join(root, "tooling/src/AppHost");
    const project = yield* readManifest(paths.join(root, appHost), equal);
    const ids = [...project.matchAll(/<UserSecretsId>([a-z0-9][a-z0-9.-]*)<\/UserSecretsId>/giu)];
    const id = ids.length === 1 ? ids[0]?.[1] : undefined;
    const launch = record(parseJson(yield* readManifest(paths.join(hostDir, "Properties/launchSettings.json"), equal)));
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
    const secretsRoot = appData ?? (env.platform === "win32" ? undefined : env.variables["HOME"]);
    if (id === undefined || !isLocal(secretsRoot)) return blocked;
    const secretsDirectory = appData === undefined ? ".microsoft/usersecrets" : "Microsoft/UserSecrets";
    const environment = environmentKeys(env, parameters, (name) => name.replaceAll("__", ":"));
    const sources = yield* Effect.all([
      projectConfigFile(paths.join(secretsRoot, secretsDirectory, id, "secrets.json"), projectAppHostParameterKeys, equal),
      projectConfigFile(paths.join(hostDir, "appsettings.Development.json"), projectAppHostParameterKeys, equal),
      projectConfigFile(paths.join(hostDir, "appsettings.json"), projectAppHostParameterKeys, equal),
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

function inspectWebsiteConfig(root: string, env: EnvironmentSnapshot): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const remediation = "See Setup action react.environment.write; no credential values were returned.";
    const blocked = capability(
      "website-config",
      false,
      "",
      `Worktree preparation: the effective Next development environment could not be projected. ${remediation}`,
    );
    const windows = env.platform === "win32";
    const nodeEnv = Object.keys(env.variables).find((key) => (windows ? key.toUpperCase() : key) === "NODE_ENV");
    if (nodeEnv !== undefined && env.variables[nodeEnv] !== "development") return blocked;
    const environment = environmentKeys(env, integrationKeys, (name) => name, windows);
    const {paths, equal} = pathProfile(env.platform);
    const website = paths.join(root, "sites/arolariu.ro");
    const sources = yield* Effect.forEach([".env.development.local", ".env.local", ".env.development", ".env"], (file) =>
      projectConfigFile(paths.join(website, file), projectWebsiteKeys, equal),
    );
    if (!environment || sources.some((source) => source === undefined)) return blocked;
    return keyEvidence("website-config", integrationKeys, [environment, ...sources.filter((source) => source != null)], remediation);
  });
}

function inspectExpConfig(root: string, platform: NodeJS.Platform): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {paths, equal} = pathProfile(platform);
    const exp = paths.join(root, "sites/exp.arolariu.ro");
    const required = yield* projectConfigFile(paths.join(exp, "config.template.json"), projectExpTypes, equal);
    const local = yield* projectConfigFile(paths.join(exp, "config.docker.json"), projectExpTypes, equal);
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

function inspectPowerShell(root: string): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.gen(function* () {
    const outcome = yield* run(probes.workspace.executableResolution("pwsh.exe", "win32"), {cwd: root});
    const entry = outcome.kind === "succeeded" ? outcome.stdout.split(/\r?\n/u)[0] : undefined;
    const version =
      localDrivePath(entry) && win32.basename(entry).toLowerCase() === "pwsh.exe"
        ? yield* run(probes.infrastructure.windowsPowerShellVersion(), {cwd: root})
        : undefined;
    const parsed = version?.kind === "succeeded" ? /^(\d{1,2})\.(\d{1,2})\.\d+(?:\.\d+)?$/u.exec(version.stdout.trim()) : null;
    const supported = parsed !== null && (Number(parsed[1]) > 7 || (Number(parsed[1]) === 7 && Number(parsed[2]) >= 1));
    return capability(
      "powershell",
      supported,
      "PowerShell 7.1 or later was verified for read-only Windows probes.",
      "Machine bootstrap: PowerShell 7.1 or later is required. Ensure the supported pwsh.exe is first on PATH, then rerun preflight.",
    );
  });
}

function blockedByPowerShell(id: string): WorktreeCapability {
  return capability(id, false, "", "Not checked: PowerShell 7.1 or later is required. See the powershell prerequisite.");
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

function inspectDotnetTls(root: string, hasPowerShell: boolean): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.gen(function* () {
    const trust = yield* run(probes.dotnet.certificate("trust"), {cwd: root, env: dotnetEnvironment});
    const untrusted = trust.kind === "exited" && trust.exitCode === 7;
    const result = capability(
      "dotnet-tls",
      trust.kind === "succeeded",
      "The .NET check-only probe accepted stock development certificate trust; API and dashboard HTTPS were not exercised.",
      `Machine bootstrap: ${untrusted ? "the stock .NET development certificate is untrusted or its trust could not be enumerated (exit 7)" : "stock .NET development certificate trust was not established"}. See Setup actions dotnet.certificate.create and dotnet.certificate.trust (separate approval).`,
    );
    if (!untrusted || !hasPowerShell) return result;
    const inventory = yield* run(probes.dotnet.certificateInventory(), {cwd: root, env: dotnetEnvironment});
    const list = inventory.kind === "succeeded" ? parseJson(inventory.stdout) : undefined;
    if (!Array.isArray(list) || list.length === 0 || list.length > 16) return result;
    const thumbprints = new Set<string>();
    for (const candidate of list) {
      const item = record(candidate);
      const thumbprint = item?.["Thumbprint"];
      const names = item?.["X509SubjectAlternativeNameExtension"];
      if (
        typeof thumbprint !== "string"
        || !/^[0-9A-F]{40}$/u.test(thumbprint)
        || thumbprints.has(thumbprint)
        || item?.["Subject"] !== "CN=localhost"
        || item["IsHttpsDevelopmentCertificate"] !== true
        || item["IsExportable"] !== true
        || !Array.isArray(names)
        || !names.includes("localhost")
      )
        return result;
      thumbprints.add(thumbprint);
    }
    // The SDK can fail while enumerating unrelated root entries. Check every candidate against Windows trust instead.
    const native = yield* run(probes.infrastructure.windowsDotnetTrust(), {
      cwd: root,
      env: {AROLARIU_PREFLIGHT_CERT_THUMBPRINTS: [...thumbprints].join(",")},
    });
    return native.kind === "succeeded" && native.stdout.trim() === "verified"
      ? capability(
          "dotnet-tls",
          true,
          "Windows validated every SDK-listed localhost development certificate and its usable private key; API and dashboard HTTPS were not exercised.",
          "",
        )
      : result;
  });
}

function inspectPosixWebsiteTrust(
  root: string,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const blocked = capability(
      "website-tls",
      false,
      "",
      "Machine bootstrap: existing mkcert CA/signing-key presence or system trust could not be verified. See Setup actions infrastructure.mkcert.install and infrastructure.mkcert.trust (separate approval).",
    );
    const {platform, variables} = env;
    if (platform !== "linux" && platform !== "darwin") return blocked;
    if (
      names.has("node_tls_reject_unauthorized")
      || (platform === "linux"
        && ["ssl_cert_file", "ssl_cert_dir", "openssl_conf", "openssl_conf_include", "openssl_modules"].some((name) => names.has(name)))
    )
      return blocked;
    const {isLocal, equal} = pathProfile(platform);
    const home = variables["HOME"];
    const dataHome = variables["XDG_DATA_HOME"];
    let caDirectory = variables["CAROOT"];
    if (!caDirectory?.trim()) {
      if (platform === "linux" && dataHome?.trim()) {
        if (!isLocal(dataHome)) return blocked;
        caDirectory = posix.join(dataHome, "mkcert");
      } else if (isLocal(home)) {
        caDirectory = posix.join(home, platform === "linux" ? ".local/share/mkcert" : "Library/Application Support/mkcert");
      }
    }
    if (!isLocal(caDirectory) || (yield* canonicalPath(caDirectory)) !== caDirectory) return blocked;
    const publicCa = posix.join(caDirectory, "rootCA.pem");
    if (!(yield* ownedFile(publicCa, equal)) || !(yield* ownedFile(posix.join(caDirectory, "rootCA-key.pem"), equal))) return blocked;
    // Only the public certificate is passed to the native trust probe.
    const trust = yield* run(probes.infrastructure.posixMkcertTrust(platform, publicCa), {cwd: root});
    return trust.kind === "succeeded"
      ? capability(
          "website-tls",
          true,
          "System trust accepts the existing mkcert CA and its signing-key file is present; no scoped leaf or browser connection was exercised.",
          "",
        )
      : blocked;
  });
}

function inspectPosixSwc(
  file: string,
  platform: "linux" | "darwin",
  equal: (left: string, right: string) => boolean,
): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (!(yield* ownedFile(file, equal))) return false;
    const files = yield* ReadOnlyFiles;
    const data = yield* files.readPrefix(file);
    const size = BigInt((yield* files.stat(file)).size);
    const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (platform === "linux") {
      if (data.length < 64 || header.getUint32(0) !== 0x7f454c46 || data[4] !== 2 || data[5] !== 1 || data[6] !== 1) return false;
      const offset = header.getBigUint64(32, true);
      const count = header.getUint16(56, true);
      return (
        header.getUint16(16, true) === 3
        && header.getUint16(18, true) === 62
        && header.getUint32(20, true) === 1
        && header.getUint16(52, true) === 64
        && header.getUint16(54, true) === 56
        && offset >= 64n
        && count > 0
        && offset + BigInt(count * 56) <= size
      );
    }
    if (data.length < 32 || header.getUint32(0, true) !== 0xfeedfacf || header.getUint32(4, true) !== 0x01000007) return false;
    const type = header.getUint32(12, true);
    const count = header.getUint32(16, true);
    const commands = header.getUint32(20, true);
    return (type === 6 || type === 8) && count > 0 && commands >= count * 8 && BigInt(32 + commands) < size;
  }).pipe(Effect.orElseSucceed(() => false));
}

function inspectSwc(
  root: string,
  env: EnvironmentSnapshot,
  version: string,
  packages: Readonly<Record<string, unknown>>,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const {platform, architecture} = env;
    if (platform !== "win32" && platform !== "linux" && platform !== "darwin") return false;
    if (platform === "win32" ? machineType(architecture) === undefined : architecture !== "x64") return false;
    const {paths, equal} = pathProfile(platform);
    const suffix = platform === "win32" ? `win32-${architecture}-msvc` : platform === "linux" ? "linux-x64-gnu" : "darwin-x64";
    const name = `@next/swc-${suffix}`;
    const filename = `next-swc.${suffix}.node`;
    const next = paths.join(root, "node_modules/next");
    const manifest = record(parseJson(yield* readManifest(paths.join(next, "package.json"), equal)));
    if (record(manifest?.["optionalDependencies"])?.[name] !== version) return false;
    // Next resolves a nested package before its hoisted sibling, then looks in its own local fallback cache.
    for (const [prefix, locked] of [
      ["node_modules/next/node_modules", true],
      ["node_modules", true],
      ["node_modules/next/next-swc-fallback", false],
    ] as const) {
      const location = `${prefix}/${name}`;
      const directory = paths.join(root, location);
      const binding = paths.join(directory, filename);
      const candidate = record(parseJson(yield* readManifest(paths.join(directory, "package.json"), equal)));
      if (
        candidate?.["name"] === name
        && candidate["version"] === version
        && candidate["main"] === filename
        && (!locked || record(packages[location])?.["version"] === version)
        && (yield* platform === "win32" ? inspectPayload(root, binding, architecture, "swc") : inspectPosixSwc(binding, platform, equal))
      )
        return true;
      if (locked && (yield* inspectPath(directory)).kind !== "missing") return false;
    }
    return false;
  }).pipe(Effect.orElseSucceed(() => false));
}

function inspectNpm(
  root: string,
  env: EnvironmentSnapshot,
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
    const {paths, equal} = pathProfile(env.platform);
    const lock = record(parseJson(yield* readManifest(paths.join(root, "package-lock.json"), equal)));
    const packages = record(lock?.["packages"]);
    const manifest = record(parseJson(yield* readManifest(paths.join(root, "package.json"), equal)));
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
    if (!(yield* inspectSwc(root, env, lockedNext["version"], packages))) {
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
          const manifestPath = paths.join(root, path, "package.json");
          if (entry["link"] === true) {
            const target = entry["resolved"];
            if (typeof target !== "string" || !LOCK_PATH.test(target) || !record(packages[target])) return false;
            const expected = paths.join(root, target, "package.json");
            const actual = yield* canonicalPath(manifestPath);
            return actual !== undefined && equal(actual, expected) && (yield* ownedFile(expected, equal));
          }
          const manifest = record(parseJson(yield* readManifest(manifestPath, equal)));
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

function inspectWebsiteArtifacts(root: string, platform: NodeJS.Platform): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  const {paths, equal} = pathProfile(platform);
  return Effect.map(
    Effect.all([
      ownedFile(paths.join(root, "sites/arolariu.ro/licenses.json"), equal),
      ownedFile(paths.join(root, "scripts/__generated__/gql/README.placeholder.txt"), equal),
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

function inspectPython(root: string, platform: NodeJS.Platform): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const blocked = capability(
      "python-dependencies",
      false,
      "",
      "Worktree preparation: local exp .venv and requirement versions were not verified. See Setup actions python.venv.create and python.dependencies.install (separate approval).",
    );
    const {paths, equal, isLocal} = pathProfile(platform);
    const exp = paths.join(root, "sites/exp.arolariu.ro");
    const venv = paths.join(exp, ".venv");
    const requirements = yield* readManifest(paths.join(exp, "requirements.txt"), equal);
    const venvConfig = yield* readManifest(paths.join(venv, "pyvenv.cfg"), equal);
    const packageSettings = [...venvConfig.matchAll(/^[ \t]*include-system-site-packages[ \t]*=[ \t]*(\S+)[ \t]*\r?$/gimu)];
    if (packageSettings.length !== 1 || packageSettings[0]?.[1]?.toLowerCase() !== "false") return blocked;

    let packages: string;
    const files = yield* ReadOnlyFiles;
    if (platform === "win32") {
      if (!(yield* ownedFile(paths.join(venv, "Scripts/python.exe"), equal))) return blocked;
      packages = paths.join(venv, "Lib/site-packages");
    } else {
      const versions = [...venvConfig.matchAll(/^[ \t]*version[ \t]*=[ \t]*(3\.\d+)\.\d+[ \t]*\r?$/gmu)];
      const version = versions[0]?.[1];
      const bin = paths.join(venv, "bin");
      // Standard POSIX venvs link the interpreter, not the environment directory.
      if (versions.length !== 1 || version === undefined || (yield* canonicalPath(venv)) !== venv || (yield* canonicalPath(bin)) !== bin) {
        return blocked;
      }
      const target = yield* canonicalPath(paths.join(bin, "python"));
      if (!isLocal(target) || !/^python(?:3(?:\.\d+)?)?$/u.test(paths.basename(target))) return blocked;
      const interpreter = yield* files.stat(target).pipe(Effect.orElseSucceed(() => undefined));
      if (interpreter?.type !== "File" || interpreter.size <= 0 || (interpreter.mode & 0o111) === 0) return blocked;
      packages = paths.join(venv, "lib", `python${version}`, "site-packages");
    }

    const actual = yield* canonicalPath(packages);
    if (actual === undefined || !equal(actual, packages)) return blocked;
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
        return matchesLocalPythonPin(operator, expected, version) && (yield* ownedFile(paths.join(packages, entry, "METADATA"), equal));
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

function nugetManifestPath(
  directory: string,
  id: string,
  platform: NodeJS.Platform,
): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  const expected = `${id}.nuspec`;
  if (platform === "win32") return Effect.succeed(win32.join(directory, expected));
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    // NuGet preserves the archive's manifest spelling, even though the cache ID is lower-case.
    const matches = (yield* files.readDirectory(directory)).filter((name) => name.toLowerCase() === expected);
    return matches.length === 1 && matches[0] !== undefined ? posix.join(directory, matches[0]) : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function inspectRestoreProject(
  root: string,
  project: string,
  checked: Map<string, boolean>,
  platform: NodeJS.Platform,
): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {paths, equal, isLocal} = pathProfile(platform);
    const directory = paths.dirname(project);
    const assets = record(parseJson(yield* readManifest(paths.join(directory, "obj/project.assets.json"), equal)));
    const restore = record(record(assets?.["project"])?.["restore"]);
    const declaredProject = restore?.["projectPath"];
    const targets = record(assets?.["targets"]);
    const libraries = record(assets?.["libraries"]);
    const groups = record(assets?.["projectFileDependencyGroups"]);
    const folders = Object.keys(record(assets?.["packageFolders"]) ?? {});
    if (
      (assets?.["version"] !== 3 && assets?.["version"] !== 4)
      || typeof declaredProject !== "string"
      || !equal(declaredProject, project)
      || !(yield* ownedFile(project, equal))
      || !targets
      || Object.keys(targets).length === 0
      || !libraries
      || !groups
      || Object.keys(groups).length === 0
      || folders.length === 0
      || !folders.every(isLocal)
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
          const linked = paths.resolve(directory, path.replaceAll("\\", "/"));
          const relative = paths.relative(root, linked);
          if (
            relative === ".."
            || relative.startsWith(`..${paths.sep}`)
            || paths.isAbsolute(relative)
            || !(yield* ownedFile(linked, equal))
          )
            return false;
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

    if (equal(project, paths.join(root, appHost)) && referenced.size === 0) return false;
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
          const packageDir = paths.join(folder, path);
          const observation = yield* inspectPath(packageDir).pipe(Effect.orElseSucceed(() => undefined));
          if (observation?.kind === "missing") continue;
          if (observation?.kind !== "directory") break;
          const contentHash = yield* projectConfigFile(
            paths.join(packageDir, ".nupkg.metadata"),
            (text) => {
              const value = record(parseJson(text))?.["contentHash"];
              return typeof value === "string" ? value : undefined;
            },
            equal,
          );
          const packageHash = (yield* readManifest(paths.join(packageDir, `${path.replace("/", ".")}.nupkg.sha512`), equal)).trim();
          // NuGet uses the first match; do not borrow missing payloads from other folders.
          const manifest = yield* nugetManifestPath(packageDir, id, platform);
          const hasManifest = manifest !== undefined && (yield* ownedFile(manifest, equal));
          const files = yield* Effect.forEach(artifacts, (file) => ownedFile(paths.join(packageDir, file), equal), {concurrency: 16});
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
      const options = record(runtime?.["runtimeOptions"]);
      const version = framework.slice("net".length);
      const expected = `.NETCoreApp,Version=v${version}`;
      const targetName = record(deps?.["runtimeTarget"])?.["name"];
      const rid = `win-${architecture}`;
      if (options?.["tfm"] !== framework || (targetName !== expected && targetName !== `${expected}/${rid}`)) return false;
      const frameworks =
        Array.isArray(options["frameworks"]) && !Object.hasOwn(options, "framework")
          ? options["frameworks"]
          : !Object.hasOwn(options, "frameworks")
            ? [options["framework"]]
            : [];
      const declared = frameworks.map(record);
      if (
        Object.hasOwn(options, "includedFrameworks")
        || declared.filter((item) => item?.["name"] === "Microsoft.NETCore.App").length !== 1
        || !declared.every(
          (item) =>
            ["Microsoft.NETCore.App", "Microsoft.AspNetCore.App"].includes(String(item?.["name"]))
            && typeof item?.["version"] === "string"
            && new RegExp(`^${version.replace(".", "\\.")}\\.\\d+$`, "u").test(item["version"]),
        )
      )
        return false;
      if (["rollForward", "applyPatches", "rollForwardOnNoCandidateFx"].some((key) => Object.hasOwn(options, key))) return false;
      const runtimes = yield* run(probes.dotnet.runtimeList(), {cwd: root, env: dotnetEnvironment});
      if (
        runtimes.kind !== "succeeded"
        || !declared.every((required) => {
          const requested = String(required?.["version"]);
          const current = Number(requested.split(".").at(-1));
          return runtimes.stdout.split(/\r?\n/u).some((line) => {
            const match = /^(Microsoft\.(?:NETCore|AspNetCore)\.App) (\d+\.\d+)\.(\d+) \[[^\r\n]+\]$/u.exec(line.trim());
            return match?.[1] === required?.["name"] && match?.[2] === version && Number(match?.[3]) >= current;
          });
        })
      )
        return false;
      const target = record(record(deps?.["targets"])?.[targetName]);
      if (!target || Object.keys(target).length > 512) return false;
      const owner = Object.entries(target).filter(([key]) => [`aspire.cli/${pin}`, `aspire/${pin}`].includes(key.toLowerCase()));
      if (owner.length !== 1 || !Object.hasOwn(record(record(owner[0]?.[1])?.["runtime"]) ?? {}, path)) return false;
      const companions = new Map<string, {path: string; role: CompanionRole}>();
      for (const value of Object.values(target)) {
        const item = record(value);
        if (!item) return false;
        for (const section of ["runtime", "native", "resources", "runtimeTargets"]) {
          if (!Object.hasOwn(item, section)) continue;
          const files = record(item[section]);
          if (!files) return false;
          for (const [file, value] of Object.entries(files)) {
            const metadata = record(value);
            if (!ARTIFACT_PATH.test(file) || !metadata) return false;
            const basename = win32.basename(file);
            if (basename === "_._") continue;
            let kind = section;
            let relative = basename;
            if (section === "runtimeTargets") {
              // A portable target's RID fallback graph is not modeled. For an explicit
              // Windows target, accept only its exact published RID companion paths.
              if (targetName !== `${expected}/${rid}` || metadata["rid"] !== rid) return false;
              const assetType = metadata["assetType"];
              if (assetType !== "runtime" && assetType !== "native") return false;
              kind = assetType;
              relative = file;
            } else if (section === "resources") {
              const locale = metadata["locale"];
              if (typeof locale !== "string" || !/^[a-z0-9-]+$/iu.test(locale)) return false;
              relative = `${locale}/${basename}`;
            }
            const key = win32.normalize(relative).toLowerCase();
            if (key === path.toLowerCase()) {
              if (section !== "runtime" || relative !== path) return false;
              continue; // The entry point is verified separately as an application.
            }
            const extension = win32.extname(basename).toLowerCase();
            const role =
              extension === ".dll"
                ? kind === "native"
                  ? "native-library"
                  : "managed-library"
                : extension === ".exe" && kind === "native"
                  ? "native-executable"
                  : undefined;
            if (role === undefined || (companions.has(key) && companions.get(key)?.role !== role)) return false;
            companions.set(key, {path: win32.join(toolDir, relative), role});
            if (companions.size > 1024) return false;
          }
        }
      }
      if (
        !(yield* Effect.forEach(companions.values(), ({path, role}) => inspectPayload(root, path, architecture, role), {
          concurrency: 4,
        })).every(Boolean)
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

// Native payload digests from Aspire 13.6.5's published NuGet and bundled release artifacts.
const posixAspirePayloads = {
  linux: {
    cli: "7a9d1c1e264c645d7d78e2891ef53a865fa51d96adf2d827fed1e9cc3cb1e253",
    dcp: "1fb8f6c741b89fe39f73f491f5b06729dd187515bbfe37cf46d7bdefd7bd67f8",
    dashboard: "6ecd3c2a86ba740cf19fc07c565251e0b8d00090577e8e5c9e0165786df6ad94",
    managed: "07ea4849a76aaa0c654da502b4170b3d97040788710a94aa05d48f7cfc723774",
  },
  darwin: {
    cli: "d69b4545e346e56559ff2c81e7abf5a8c14408786d71de040f95424a0f6e7b3e",
    dcp: "7c3c01316b05f23edb3d01af30babe4933422bc64d7c9de20a066bd838cf90cb",
    dashboard: "de6bfed7e45a8dcc918c752cfd26b072e7194b898788855414ae92697f626ca4",
    managed: "2765d8f83ceb61c47f6edd6db3fca8efee8e36a78bb89bf361ca83725ec1aaa3",
  },
} as const;
const dcpTunnelDigest = "3cd1fc90288a23cadaa966b24932230cfd05faf7a8eb976bb027652076ec52eb";

function inspectPinnedPosixFile(
  path: string,
  digest: string,
  equal: (left: string, right: string) => boolean,
  executable: boolean,
): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    if (!(yield* ownedFile(path, equal))) return false;
    const files = yield* ReadOnlyFiles;
    const stat = yield* files.stat(path);
    if (executable && (stat.mode & 0o111) === 0) return false;
    const size = Number(stat.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > 200 * 1024 * 1024) return false;
    const bytes = yield* files.readBytesBounded(path, size);
    return createHash("sha256").update(bytes).digest("hex") === digest;
  }).pipe(Effect.orElseSucceed(() => false));
}

function inspectPinnedTool(root: string, cache: string, pin: string, framework: string, env: EnvironmentSnapshot) {
  return Effect.gen(function* () {
    const {platform, architecture} = env;
    if (platform !== "win32" && platform !== "linux" && platform !== "darwin") return false;
    const {paths, equal} = pathProfile(platform);
    const rid = `${platform === "win32" ? "win" : platform === "linux" ? "linux" : "osx"}-${architecture}`;
    const entry = platform === "win32" ? "aspire.exe" : "aspire";
    const packageDir = paths.join(cache, "aspire.cli", pin);
    const packageMatches = (directory: string, id: string) =>
      Effect.gen(function* () {
        const manifest = yield* nugetManifestPath(directory, id, platform);
        if (!manifest) return false;
        const meta = yield* readManifest(manifest, equal);
        return (
          /<id>\s*([^<]+?)\s*<\/id>/iu.exec(meta)?.[1]?.toLowerCase() === id
          && /<version>\s*([^<]+?)\s*<\/version>/u.exec(meta)?.[1] === pin
          && (yield* ownedFile(paths.join(directory, ".nupkg.metadata"), equal))
        );
      });
    if (!(yield* packageMatches(packageDir, "aspire.cli"))) return false;

    const registration = paths.join(packageDir, "tools/any/any/DotnetToolSettings.xml");
    const registrationKind = (yield* inspectPath(registration)).kind;
    if (registrationKind !== "missing") {
      if (registrationKind !== "file") return false;
      const settings = readDotnetToolSettingsXml(yield* readManifest(registration, equal));
      const [document] = settings ?? [];
      const group = (name: string) => settings?.filter((node) => node.name === name && node.parent === document) ?? [];
      const commands = group("Commands");
      const packages = group("RuntimeIdentifierPackages");
      const command = settings?.filter((node) => node.name === "Command" && node.parent === commands[0]) ?? [];
      const mappings =
        settings?.filter(
          (node) =>
            node.name === "RuntimeIdentifierPackage" && node.parent === packages[0] && node.attributes.get("RuntimeIdentifier") === rid,
        ) ?? [];
      const runtimeId = `aspire.cli.${rid}`;
      if (
        document?.attributes.size !== 1
        || document.attributes.get("Version") !== "2"
        || commands.length !== 1
        || packages.length !== 1
        || command.length !== 1
        || command[0]?.attributes.size !== 1
        || command[0].attributes.get("Name") !== "aspire"
        || mappings.length !== 1
        || mappings[0]?.attributes.size !== 2
        || mappings[0].attributes.get("Id")?.toLowerCase() !== runtimeId
      )
        return false;

      const runtimeDir = paths.join(cache, runtimeId, pin);
      if (!(yield* packageMatches(runtimeDir, runtimeId))) return false;
      const tool = paths.join(runtimeDir, "tools", framework, rid);
      const payloadSettings = readDotnetToolSettingsXml(yield* readManifest(paths.join(tool, "DotnetToolSettings.xml"), equal));
      const payload = payloadSettings?.find((node) => node.name === "Command");
      if (
        payloadSettings?.length !== 3
        || payloadSettings[0]?.attributes.get("Version") !== "2"
        || payload?.parent?.name !== "Commands"
        || payload.attributes.size !== 3
        || payload.attributes.get("Name") !== "aspire"
        || payload.attributes.get("Runner") !== "executable"
        || payload.attributes.get("EntryPoint") !== entry
      )
        return false;
      return yield* platform === "win32"
        ? inspectPayload(root, paths.join(tool, entry), architecture, "cli-native", pin)
        : inspectPinnedPosixFile(paths.join(tool, entry), posixAspirePayloads[platform].cli, equal, true);
    }

    if (platform !== "win32") return false;
    const roots = [win32.join(packageDir, "tools", framework, rid), win32.join(packageDir, "tools", framework, "any")];
    const tools = yield* Effect.forEach(roots, (path) => inspectPath(path));
    const candidates = roots.filter((_, index) => tools[index]?.kind === "directory");
    const [tool] = candidates;
    return candidates.length === 1 && tool !== undefined && (yield* inspectToolPayload(root, tool, architecture, framework, pin));
  });
}

const bundleBuildOverride =
  /^(?:Import(?:Group)?|Choose|Target|UsingTask|AspireCliBundlePath|AspireCliPath|DcpDir|DcpCliPath|DcpExtensionsDir|AspireDashboardDir|AspireDashboardPath|AspireHostingSDKVersion)\b/iu;

function inspectDcp(
  root: string,
  directory: string,
  architecture: string,
  pin: string,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const dcp = win32.join(directory, "dcp/dcp.exe");
    if (yield* inspectPayload(root, dcp, architecture, "dcp")) return true;
    // The official 13.6.5 x64 payload has no DCP version resource.
    if (pin !== "13.6.5" || architecture !== "x64") return false;
    const files = yield* ReadOnlyFiles;
    for (const [name, digest] of [
      ["dcp.exe", "16674dbfe3a67a80df110fc6ecd54e8ef1d512d0b538188d8e16808e422a3fb2"],
      ["dcptun_c", dcpTunnelDigest],
    ] as const) {
      const path = win32.join(directory, "dcp", name);
      if (!(yield* ownedFile(path))) return false;
      const bytes = yield* files.readBytesBounded(path, 100 * 1024 * 1024);
      if (createHash("sha256").update(bytes).digest("hex") !== digest) return false;
    }
    return true;
  }).pipe(Effect.orElseSucceed(() => false));
}

function isBundleBuildOverride(name: string): boolean {
  return bundleBuildOverride.test(name) || isUnmodeledBuildFileSelector(name);
}

function supportsBundleBuildFile(elements: readonly BuildXmlElement[] | undefined): elements is readonly BuildXmlElement[] {
  return (
    elements !== undefined
    && elements.every(
      ({name, attributes}) =>
        !isBundleBuildOverride(name)
        && !/^(?:Sdk|AspireUseCliBundle|AspireCliInvocationMode)\b/iu.test(name)
        && (!/^Project\b/iu.test(name) || ![...attributes.keys()].some((key) => key.toLowerCase() === "sdk")),
    )
  );
}

function supportsAppHostBuildLayout(root: string, platform: NodeJS.Platform): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {paths, key, equal} = pathProfile(platform);
    const tooling = paths.join(root, "tooling");
    for (let dir = paths.dirname(paths.join(root, appHost)); ; dir = paths.dirname(dir)) {
      if (!equal(dir, tooling) && key(dir).startsWith(`${key(tooling)}${paths.sep}`)) {
        for (const name of ["Directory.Build.props", "Directory.Packages.props"]) {
          if ((yield* inspectPath(paths.join(dir, name))).kind !== "missing") return false;
        }
      }
      const targets = paths.join(dir, "Directory.Build.targets");
      if ((yield* inspectPath(targets)).kind !== "missing") {
        if (!equal(dir, root) && !key(dir).startsWith(`${key(root)}${paths.sep}`)) return false;
        if (!supportsBundleBuildFile(readBuildProjectXml(yield* readManifest(targets, equal)))) return false;
      }
      if (dir === paths.dirname(dir)) return true;
    }
  }).pipe(Effect.orElseSucceed(() => false));
}

function selectedVariable(env: EnvironmentSnapshot, name: string): string | undefined {
  const keys = Object.keys(env.variables).filter((key) => key.toLowerCase() === name);
  const [key] = keys;
  return keys.length === 1 && key !== undefined ? env.variables[key] : undefined;
}

function pinnedBundleRoot(layout: string, pin: string, platform: NodeJS.Platform): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  const pinnedDirectory = new RegExp(`^${pin.replaceAll(".", "\\.")}(?:_[0-9a-f]{7,64}(?:-[0-9a-f]{7,64})?)?$`, "iu");
  return Effect.gen(function* () {
    const {paths, equal} = pathProfile(platform);
    const root = yield* canonicalPath(layout);
    if (root === undefined || !equal(root, layout)) return undefined;
    // Installed 13.6.5 resolver tries the layout itself, its bundle child, then its versions.
    // Recognize only unambiguous local layouts; do not skip a partial/unsupported higher-priority one.
    for (const candidate of [root, paths.join(root, "bundle")]) {
      const metadata = yield* inspectPath(candidate);
      if (metadata.kind === "missing") continue;
      if (metadata.kind !== "directory") return undefined;
      const parts = yield* Effect.forEach(["dcp", "managed", "dashboard"], (name) => inspectPath(paths.join(candidate, name)));
      if (equal(candidate, root) && parts.slice(0, 2).every((part) => part.kind === "missing")) continue;
      const canonical = yield* canonicalPath(candidate);
      if (canonical === undefined) return undefined;
      if (equal(candidate, canonical)) return canonical;
      const destination = paths.relative(paths.join(root, "versions"), canonical);
      return pinnedDirectory.test(destination) ? canonical : undefined;
    }
    const versions = paths.join(root, "versions");
    const canonicalVersions = yield* canonicalPath(versions);
    if (canonicalVersions === undefined || !equal(canonicalVersions, versions)) return undefined;
    const files = yield* ReadOnlyFiles;
    const entries = yield* files.readDirectory(versions);
    const candidates = entries.filter((entry) => !/\.(?:tmp|old|bad)\./iu.test(entry));
    const [entry] = candidates;
    if (candidates.length !== 1 || entry === undefined || !pinnedDirectory.test(entry)) return undefined;
    const candidate = paths.join(versions, entry);
    const actual = yield* canonicalPath(candidate);
    return actual !== undefined && equal(actual, candidate) ? actual : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function inspectPinnedBundle(
  root: string,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
  app: readonly BuildXmlElement[],
  pin: string,
  framework: string,
): Effect.Effect<boolean, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const {platform, architecture} = env;
    if (platform !== "win32" && platform !== "linux" && platform !== "darwin") return false;
    const {paths, equal, isLocal} = pathProfile(platform);
    const windows = platform === "win32";
    // This layout was read from the installed 13.6.5 SDK. Other resolver/profile contracts need separate evidence.
    const unsupported = [
      "aspireclipath",
      "aspirecliinvocationmode",
      "aspireuseclibundle",
      "aspirehostingsdkversion",
      "dcpdir",
      "dcpclipath",
      "dcpextensionsdir",
      "dotnet_roll_forward",
      "dotnet_roll_forward_to_prerelease",
      "dotnet_root",
      "dotnet_root_x64",
      "dotnet_root_arm64",
      "aspiredashboarddir",
      "aspiredashboardpath",
      "aspireterminalhostdir",
      "aspireterminalhostpath",
      "aspireterminalhostinvocationargs",
      "_aspireclisetuphome",
      "msbuildsdkspath",
      "msbuildprojectextensionspath",
      "dotnet_cli_home",
      "custombeforemicrosoftcommontargets",
      "custombeforemicrosoftcommoncrosstargetingtargets",
    ];
    if (
      pin !== "13.6.5"
      || unsupported.some((name) => names.has(name))
      || [...names].some(isUnmodeledBuildFileSelector)
      || (windows ? machineType(architecture) === undefined : architecture !== "x64")
    )
      return false;
    for (const key of ["customaftermicrosoftcommontargets", "customaftermicrosoftcommoncrosstargetingtargets"]) {
      if (!names.has(key)) continue;
      const hook = selectedVariable(env, key);
      if (!isLocal(hook) || (yield* inspectPath(hook)).kind !== "missing") return false;
    }
    const [useBundle, ...otherUses] = app.filter(({name}) => /^AspireUseCliBundle\b/iu.test(name));
    const [mode, ...otherModes] = app.filter(({name}) => /^AspireCliInvocationMode\b/iu.test(name));
    const group = useBundle?.parent;
    if (
      group?.name !== "PropertyGroup"
      || group.parent !== app[0]
      || group.attributes.size !== 0
      || useBundle?.name !== "AspireUseCliBundle"
      || useBundle.hasChildren
      || useBundle.attributes.size !== 0
      || useBundle.text !== "true"
      || mode?.name !== "AspireCliInvocationMode"
      || mode.parent !== group
      || mode.hasChildren
      || mode.attributes.size !== 0
      || mode.text !== "DnxPinned"
      || otherUses.length !== 0
      || otherModes.length !== 0
      || app.some(({name}) => isBundleBuildOverride(name))
      || !app.some(
        ({name, parent, attributes, selfClosing}) =>
          name === "PackageReference"
          && parent?.name === "ItemGroup"
          && parent.parent === app[0]
          && selfClosing
          && attributes.size === 1
          && attributes.get("Include") === "Aspire.Hosting.AppHost",
      )
    )
      return false;
    // The resolver assembly is supplied by the Hosting.AppHost package, not just the SDK declaration.
    const pins = readBuildProjectXml(yield* readManifest(paths.join(root, "tooling/Directory.Packages.props"), equal));
    const buildProps = readBuildProjectXml(yield* readManifest(paths.join(root, "tooling/Directory.Build.props"), equal));
    if (!supportsBundleBuildFile(pins) || !supportsBundleBuildFile(buildProps) || !(yield* supportsAppHostBuildLayout(root, platform)))
      return false;
    const [hostingPin, ...otherPins] = pins.filter(
      ({name, attributes}) =>
        /^PackageVersion\b/iu.test(name)
        && [...attributes].some(([key, value]) => /^(?:Include|Update)$/iu.test(key) && value.toLowerCase() === "aspire.hosting.apphost"),
    );
    if (
      hostingPin?.name !== "PackageVersion"
      || hostingPin.parent?.name !== "ItemGroup"
      || hostingPin.parent.parent !== pins[0]
      || !hostingPin.selfClosing
      || hostingPin.attributes.size !== 2
      || hostingPin.attributes.get("Include") !== "Aspire.Hosting.AppHost"
      || hostingPin.attributes.get("Version") !== pin
      || otherPins.length !== 0
    )
      return false;
    const explicit = selectedVariable(env, "aspireclibundlepath");
    const aspireHome = selectedVariable(env, "aspire_home");
    const nuget = selectedVariable(env, "nuget_packages");
    if (
      (names.has("aspireclibundlepath") && !isLocal(explicit))
      || (names.has("aspire_home") && !isLocal(aspireHome))
      || (names.has("nuget_packages") && !isLocal(nuget))
    )
      return false;
    let profile: string | undefined;
    if ((explicit === undefined && aspireHome === undefined) || nuget === undefined) {
      if (windows) {
        const outcome = yield* run(probes.infrastructure.windowsUserProfile(), {cwd: root});
        profile = outcome.kind === "succeeded" ? outcome.stdout.trim() : undefined;
        const claimed = selectedVariable(env, "userprofile");
        if (!isLocal(profile) || (names.has("userprofile") && (!claimed || !equal(profile, claimed)))) return false;
      } else {
        profile = env.variables["HOME"];
        if (!isLocal(profile) || (yield* canonicalPath(profile)) !== profile) return false;
      }
    }
    const layout = explicit ?? aspireHome ?? paths.join(profile ?? "", ".aspire");
    const cache = nuget ?? paths.join(profile ?? "", ".nuget/packages");
    const directory = yield* pinnedBundleRoot(layout, pin, platform);
    if (!directory) return false;

    const sdkDir = paths.join(cache, "aspire.apphost.sdk", pin, "Sdk");
    if (
      !(yield* ownedFile(paths.join(sdkDir, "Sdk.targets"), equal))
      || !(yield* ownedFile(paths.join(sdkDir, "Sdk.props"), equal))
      || !(yield* inspectPinnedTool(root, cache, pin, framework, env))
      || !(yield* ownedFile(paths.join(directory, "dcp/dcptun_c"), equal))
    )
      return false;
    if (!windows) {
      const hashes = posixAspirePayloads[platform];
      for (const [part, digest, executable] of [
        ["dcp/dcp", hashes.dcp, true],
        ["dcp/dcptun_c", dcpTunnelDigest, false],
        ["managed/aspire-managed", hashes.managed, true],
        ["dashboard/Aspire.Dashboard", hashes.dashboard, true],
      ] as const) {
        if (!(yield* inspectPinnedPosixFile(paths.join(directory, part), digest, equal, executable))) return false;
      }
      return true;
    }
    const observations = yield* Effect.all(
      [
        inspectDcp(root, directory, env.architecture, pin),
        inspectPayload(root, win32.join(directory, "managed/aspire-managed.exe"), env.architecture, "managed", pin),
        inspectPayload(root, win32.join(directory, "dashboard/Aspire.Dashboard.exe"), env.architecture, "dashboard", pin),
      ],
      {concurrency: "unbounded"},
    );
    return observations.every(Boolean);
  }).pipe(Effect.orElseSucceed(() => false));
}

function toolingFramework(
  root: string,
  platform: NodeJS.Platform,
): Effect.Effect<{readonly version: string; readonly target: string} | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {paths, equal} = pathProfile(platform);
    const props = readBuildProjectXml(yield* readManifest(paths.join(root, "tooling/Directory.Build.props"), equal));
    const framework = /^net(\d+\.\d+)$/u.exec(
      props?.find(
        ({name, attributes, hasChildren, parent}) =>
          name === "TargetFramework"
          && attributes.size === 0
          && !hasChildren
          && parent?.name === "PropertyGroup"
          && parent.parent === props[0],
      )?.text ?? "",
    );
    return framework?.[1] === undefined ? undefined : {version: framework[1], target: framework[0]};
  });
}

function inspectDotnetSdk(root: string, framework: string | undefined): Effect.Effect<WorktreeCapability, never, Process> {
  return Effect.gen(function* () {
    const listing = framework === undefined ? undefined : yield* run(probes.dotnet.sdkList(), {cwd: root, env: dotnetEnvironment});
    const found =
      listing?.kind === "succeeded"
      && listing.stdout.split(/\r?\n/u).some((line) => line.startsWith(`${framework}.`) && /^\d+\.\d+\.\d+ \[.+\]$/u.test(line));
    return capability(
      "dotnet-sdk",
      found,
      "A stable SDK for the tooling target framework is listed.",
      "Machine bootstrap: the required .NET SDK was not observed. See Setup action dotnet.install-sdk.",
    );
  });
}

function inspectRestoreAssets(
  paths: RepositoryPaths,
  platform: NodeJS.Platform,
): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles | Process | Environment> {
  return Effect.gen(function* () {
    const {paths: pathApi, equal} = pathProfile(platform);
    const checked = new Map<string, boolean>();
    const receiptBefore = yield* currentWorktreeRestoreEvidence(paths);
    let appHostObserved = false;
    const solution = yield* inspectSolution(paths, (project) => {
      if (equal(project, pathApi.join(paths.root, appHost))) appHostObserved = true;
      return inspectRestoreProject(paths.root, project, checked, platform);
    });
    const assets = appHostObserved && solution.issues.length === 0 && solution.restoreIssues.length === 0;
    const fresh = assets && receiptBefore !== undefined && (yield* currentWorktreeRestoreEvidence(paths)) === receiptBefore;
    return capability(
      "nuget-assets",
      fresh,
      "Setup's checkout-bound restore receipt matches the current inputs and graph; the referenced local NuGet package files were observed.",
      assets
        ? `Worktree preparation: local NuGet artifacts were observed, but the checkout-bound restore freshness evidence is absent, stale, or unavailable. ${worktreeRestoreRemediation}`
        : `Worktree preparation: solution restore artifacts could not be verified. ${worktreeRestoreRemediation}`,
    );
  });
}

function inspectBundleCapability(
  root: string,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
  framework: string | undefined,
): Effect.Effect<WorktreeCapability, never, ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const {paths, equal} = pathProfile(env.platform);
    const project = readBuildProjectXml(yield* readManifest(paths.join(root, appHost), equal));
    const pin = project
      ?.find(
        ({name, parent, attributes, selfClosing}) =>
          name === "Sdk"
          && parent === project[0]
          && selfClosing
          && attributes.size === 2
          && attributes.get("Name") === "Aspire.AppHost.Sdk",
      )
      ?.attributes.get("Version");
    const verified = !!(project && pin && framework && (yield* inspectPinnedBundle(root, env, names, project, pin, framework)));
    return capability(
      "aspire-bundle",
      verified,
      "The pinned DNX CLI and selected local Dashboard, managed runtime and DCP payloads were observed without execution.",
      "Machine bootstrap: the pinned DNX CLI or selected Aspire bundle could not be verified. See tooling/README.md (Development and debugging) for separately approved bundle preparation.",
    );
  });
}

function inspectBundle(
  paths: RepositoryPaths,
  env: EnvironmentSnapshot,
  names: ReadonlySet<string>,
  hasPowerShell: boolean,
): Effect.Effect<readonly WorktreeCapability[], never, ReadOnlyFiles | Process | Environment> {
  return Effect.gen(function* () {
    const framework = yield* toolingFramework(paths.root, env.platform);
    const sdk = yield* inspectDotnetSdk(paths.root, framework?.version);
    const assets = yield* inspectRestoreAssets(paths, env.platform);
    return [
      sdk,
      assets,
      hasPowerShell
        ? yield* inspectBundleCapability(paths.root, env, names, sdk.status === "pass" ? framework?.target : undefined)
        : blockedByPowerShell("aspire-bundle"),
    ];
  });
}

/**
 * Inspects an attached, canonical worktree and its bounded local prerequisites.
 * Configuration is projected to key facts in-process; no setup, trust mutation, or launch is performed.
 *
 * @param input - Expected canonical checkout and explicit local engine selection.
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
): Effect.Effect<WorktreePreflightResult, never, Process | ReadOnlyFiles | Environment> {
  return Effect.gen(function* () {
    if (!isWorktreePlatform(env.platform)) {
      return {
        status: "blocked",
        checkout: null,
        capabilities: [capability("checkout", false, "", "Worktree preflight supports Windows, Linux and macOS only.")],
      };
    }
    const checkout = yield* observeCheckout(input.expectedRoot, env, names);
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
    const checkoutCapability = capability("checkout", true, "Canonical, attached linked-worktree identity was observed.", "");
    const engine = input.engine === "podman" ? inspectPodman(root, names, env) : inspectRancher(root, names, env);
    const config = [inspectAppHostConfig(root, env), inspectWebsiteConfig(root, env)] as const;
    const artifacts = inspectWebsiteArtifacts(root, env.platform);
    const expConfig = inspectExpConfig(root, env.platform);
    const python = inspectPython(root, env.platform);
    if (env.platform !== "win32" || env.architecture !== "x64") {
      const nativeTls = env.platform === "linux" || env.platform === "darwin";
      const managed = Effect.gen(function* () {
        const framework = yield* toolingFramework(root, env.platform);
        const sdk = yield* inspectDotnetSdk(root, framework?.version);
        if (!nativeTls) return [sdk];
        const tls =
          sdk.status === "pass"
            ? yield* inspectDotnetTls(root, false)
            : capability("dotnet-tls", false, "", "Not checked: the required .NET SDK was not observed.");
        const bundle = yield* inspectBundleCapability(root, env, names, sdk.status === "pass" ? framework?.target : undefined);
        return [sdk, tls, bundle];
      });
      const checks = yield* Effect.all(
        [
          ...config,
          engine,
          artifacts,
          expConfig,
          python,
          ...(nativeTls
            ? [
                inspectPosixWebsiteTrust(root, env, names),
                inspectRestoreAssets(createRepositoryPaths(root), env.platform),
                inspectNpm(root, env, names),
              ]
            : []),
        ],
        {concurrency: "unbounded"},
      );
      return {
        status: "blocked",
        checkout,
        capabilities: [
          checkoutCapability,
          ...checks,
          ...(yield* managed),
          capability(
            "host-preparation",
            false,
            "",
            "Full scoped prerequisites are implemented only for Windows x64; partial preparation evidence does not qualify this host.",
          ),
        ],
      };
    }
    const paths = createRepositoryPaths(root);
    const powershell = yield* inspectPowerShell(root);
    const hasPowerShell = powershell.status === "pass";
    const checks = yield* Effect.all(
      [
        engine,
        hasPowerShell ? inspectWebsiteTrust(env, root, names) : Effect.succeed(blockedByPowerShell("website-tls")),
        inspectDotnetTls(root, hasPowerShell),
        hasPowerShell ? inspectNpm(root, env, names) : Effect.succeed(blockedByPowerShell("npm-dependencies")),
        artifacts,
        python,
        expConfig,
      ],
      {concurrency: "unbounded"},
    );
    const capabilities = [
      checkoutCapability,
      powershell,
      ...(yield* Effect.all(config, {concurrency: "unbounded"})),
      ...checks,
      ...(yield* inspectBundle(paths, env, names, hasPowerShell)),
    ];
    return {status: capabilities.every((entry) => entry.status === "pass") ? "prepared" : "blocked", checkout, capabilities};
  });
}
