/**
 * @fileoverview Windows-only protected registry and immutable process observation.
 * @module scripts/container-runtime/worktreePlatform
 */

import {Effect} from "effect";
import {execFile} from "node:child_process";
import {randomInt} from "node:crypto";
import {realpath} from "node:fs/promises";
import {dirname, isAbsolute, normalize} from "node:path";
import {promisify} from "node:util";

import type {Environment} from "../platform/Environment.ts";
import type {ReadOnlyFiles} from "../platform/Files.ts";
import type {Process} from "../platform/Process.ts";
import {
  isWorktreeProcessIdentity,
  sameWorktreePath,
  type WorktreeLaunchPlatform,
  type WorktreeProcessIdentity,
  worktreeDirectory,
} from "./worktreeLease.ts";
import {observeWorktreeCheckout, observeWorktreeEngine} from "./worktreePreflight.ts";

const systemRoot = "C:\\Windows";
const windowsPowerShell = `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
const execute = promisify(execFile);

async function observeWindows(script: string): Promise<string> {
  if (process.platform !== "win32" || !sameWorktreePath(await realpath(windowsPowerShell), windowsPowerShell)) {
    throw new Error("Unsupported Windows host");
  }
  const {stdout} = await execute(
    windowsPowerShell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(`$ErrorActionPreference = 'Stop'\n[Console]::OutputEncoding = [Text.UTF8Encoding]::new()\n${script}`, "utf16le").toString(
        "base64",
      ),
    ],
    {
      timeout: 4000,
      maxBuffer: 16 * 1024,
      windowsHide: true,
      env: {SystemRoot: systemRoot, WINDIR: systemRoot, PATH: `${systemRoot}\\System32`},
    },
  );
  return stdout.trim();
}

/** Observes a kernel-backed process creation timestamp and image; does not send a signal. */
export async function windowsWorktreeProcessIdentity(pid: number): Promise<WorktreeProcessIdentity | null> {
  if (!Number.isSafeInteger(pid) || pid <= 0 || pid > 0xffff_ffff) throw new Error("Invalid PID");
  const text = await observeWindows(`
try { $proc = [Diagnostics.Process]::GetProcessById(${pid}) }
catch [ArgumentException] { [Console]::WriteLine('absent'); exit 0 }
try {
  $null = $proc.Handle
  if ($proc.HasExited) { [Console]::WriteLine('absent'); exit 0 }
  $start = $proc.StartTime.ToUniversalTime().Ticks
  $image = $proc.MainModule.FileName
  if ($proc.HasExited) { [Console]::WriteLine('absent'); exit 0 }
  [Console]::WriteLine(("{0}\`n{1}" -f $start,$image))
} finally { $proc.Dispose() }
`);
  if (text === "absent") return null;
  const [started, image, extra] = text.split(/\r?\n/u);
  const result = {pid, started, image};
  if (extra !== undefined || !isWorktreeProcessIdentity(result)) throw new Error("Unverified process");
  return result;
}

/** Gates store access on the OS-known route. */
export async function openWorktreeRegistryRoute(
  parent: string,
  openStore: (parent: string) => Promise<string | null>,
): Promise<string | null> {
  if (!isAbsolute(parent) || normalize(parent) !== parent || dirname(parent) === parent) throw new Error("Invalid registry parent");
  for (let dir = parent; ; dir = dirname(dir)) {
    if (!(await worktreeDirectory(dir))) throw new Error("Missing registry ancestor");
    if (dirname(dir) === dir) break;
  }
  return openStore(parent);
}

const localAppData = "[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)";

/** Resolves a fixed OS-known per-user store; no environment path or caller path selects it. */
export async function windowsWorktreeRegistry(create: boolean, kind: "aspire" | "fixture" = "aspire"): Promise<string | null> {
  const name = kind === "fixture" ? "arolariu-worktree-fixture-v1" : "arolariu-worktree-launch-v1";
  const parent = await observeWindows(`[Console]::WriteLine(${localAppData})`);
  if (!/^[a-z]:\\[^<>:"|?*\u0000-\u001f]+$/iu.test(parent)) throw new Error("LocalApplicationData unavailable");
  return openWorktreeRegistryRoute(parent, async (checked) => {
    const expected = Buffer.from(checked, "utf8").toString("base64");
    const path = await observeWindows(`
$local = ${localAppData}
$expected = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${expected}'))
if ($local -cne $expected -or [IO.DriveInfo]::new([IO.Path]::GetPathRoot($local)).DriveType -ne 'Fixed') {
  throw 'LocalApplicationData route changed or unsupported'
}
# Check Windows reparse attributes in the same invocation before absence or ACL creation.
for ($dir = [IO.DirectoryInfo]::new($local); $null -ne $dir; $dir = $dir.Parent) {
  $attrs = [IO.File]::GetAttributes($dir.FullName)
  if (($attrs -band [IO.FileAttributes]::Directory) -eq 0 -or ($attrs -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'Redirected registry ancestor'
  }
}
$root = [IO.Path]::Combine($local, '${name}')
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$admins = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
$allowed = @($sid, $system, $admins)
try { $attributes = [IO.File]::GetAttributes($root) }
catch [IO.FileNotFoundException] {
  if ('${create ? "create" : "read"}' -ne 'create') { [Console]::WriteLine('absent'); exit 0 }
  $newAcl = [Security.AccessControl.DirectorySecurity]::new()
  $newAcl.SetOwner($sid)
  $newAcl.SetAccessRuleProtection($true, $false)
  foreach ($principal in $allowed) {
    $newAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      $principal, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
  }
  $null = [IO.Directory]::CreateDirectory($root, $newAcl)
  $attributes = [IO.File]::GetAttributes($root)
}
if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
    ($attributes -band [IO.FileAttributes]::Directory) -eq 0) { throw 'Redirected registry' }
$acl = [IO.Directory]::GetAccessControl($root)
if (!$acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]) -ne $sid) {
  throw 'Unprotected registry owner'
}
$ownerRule = $false
foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
  if ($rule.IsInherited -or $rule.AccessControlType -ne 'Allow' -or $allowed -notcontains $rule.IdentityReference -or
      $rule.FileSystemRights -ne 'FullControl' -or $rule.InheritanceFlags -ne 'ContainerInherit,ObjectInherit' -or
      $rule.PropagationFlags -ne 'None') { throw 'Unprotected registry rule' }
  if ($rule.IdentityReference -eq $sid) { $ownerRule = $true }
}
if (!$ownerRule) { throw 'Registry owner has no inherited access' }
[Console]::WriteLine($root)
`);
    if (path === "absent") return null;
    if (!sameWorktreePath(path, `${checked}\\${name}`) || !(await worktreeDirectory(path))) throw new Error("Invalid registry");
    return path;
  });
}

/** Captures existing Effect inspection services; no live mutating container adapter is installed. */
export function localWorktreePlatform(): Effect.Effect<WorktreeLaunchPlatform, never, Environment | ReadOnlyFiles | Process> {
  return Effect.gen(function* () {
    const context = yield* Effect.context<Environment | ReadOnlyFiles | Process>();
    const checkout = observeWorktreeCheckout().pipe(Effect.provide(context));
    return {
      registry: windowsWorktreeRegistry,
      checkout,
      engine: checkout.pipe(
        Effect.flatMap((current) => (current ? observeWorktreeEngine(current).pipe(Effect.provide(context)) : Effect.succeed(undefined))),
      ),
      candidatePort: () => randomInt(49152, 65536),
      processIdentity: windowsWorktreeProcessIdentity,
    };
  });
}
