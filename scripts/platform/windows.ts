/**
 * @fileoverview Windows command resolution and `cmd.exe` escaping for child processes.
 * @module scripts/platform/windows
 *
 * @remarks
 * Effect's spawner hands commands straight to Node without `PATHEXT` resolution, so `npm` (really
 * `npm.cmd`) fails to spawn on Windows, and Node refuses to spawn `.cmd`/`.bat` files without a
 * shell. {@link planSpawn} resolves the command the way `cmd.exe` would and, for batch shims
 * (resolved or path-qualified, as legacy Execa/cross-spawn did), routes it through the shell with
 * every token quoted by the MSVCRT argv rules and `^`-escaped for `cmd.exe`, so arguments reach the
 * shim verbatim and metacharacters such as `&` never start another command. The quoting
 * intentionally differs from cross-spawn 7.0.6 `lib/util/escape.js`, whose lazy-lookahead regex
 * drops quotes after two or more backslashes; it matches the older `(\\*)"` form instead.
 */

import {win32} from "node:path";

import type {EnvironmentSnapshot} from "./Environment.ts";
import type {ProcessRequest} from "./Process.ts";

/** How a {@link ProcessRequest} is handed to the spawner. */
export interface SpawnPlan {
  /** Executable to spawn; escaped for `cmd.exe` when {@link SpawnPlan.shell} is `true`. */
  readonly command: string;
  /** Arguments; escaped for `cmd.exe` when {@link SpawnPlan.shell} is `true`. */
  readonly args: readonly string[];
  /** Whether the command runs through `cmd.exe`. */
  readonly shell: boolean;
}

const CMD_METACHARACTERS = /([()\][%!^"`<>&|;, *?])/gu;
const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";
const SHELL_EXTENSIONS = new Set([".cmd", ".bat"]);
const DIRECT_EXTENSIONS = new Set([".exe", ".com"]);

/**
 * Escapes a resolved command path for `cmd.exe` by prefixing every metacharacter with `^`.
 *
 * @param command - The resolved command path.
 * @returns The escaped command.
 */
export function escapeCmdCommand(command: string): string {
  return command.replaceAll(CMD_METACHARACTERS, "^$1");
}

/**
 * Quotes an argument with the MSVCRT rules (https://qntm.org/cmd), then escapes every `cmd.exe`
 * metacharacter with `^`.
 *
 * @remarks
 * Follows the MSVCRT argv rules: every backslash in a run that precedes a quote (or the closing
 * quote) is doubled, found by a linear scan that cannot backtrack. This intentionally differs from
 * cross-spawn 7.0.6 `escapeArgument`, whose lazy-lookahead regex `(?=(\\+?)?)\1"` captures a
 * single backslash and so drops quotes after two or more; it matches the older `(\\*)"` form.
 *
 * @param argument - The raw argument.
 * @param doubleEscape - Whether to escape metacharacters twice, which batch shims require because
 * `cmd.exe` parses the forwarded `%*` a second time.
 * @returns The escaped argument.
 */
export function escapeCmdArgument(argument: string, doubleEscape: boolean): string {
  let quoted = "";
  let backslashes = 0;
  for (const character of argument) {
    if (character === "\\") {
      backslashes += 1;
      continue;
    }
    if (character === '"') {
      quoted += `${"\\".repeat(backslashes * 2)}\\"`;
    } else {
      quoted += `${"\\".repeat(backslashes)}${character}`;
    }
    backslashes = 0;
  }
  quoted += "\\".repeat(backslashes * 2);

  const escaped = escapeCmdCommand(`"${quoted}"`);
  return doubleEscape ? escapeCmdCommand(escaped) : escaped;
}

/**
 * Reads an environment variable case-insensitively, as Windows does.
 *
 * @param variables - The environment variables.
 * @param name - The upper-case variable name.
 * @returns The value of the last matching key, so an override appended after an inherited
 * differently-cased key wins.
 */
function readWindowsVariable(variables: Readonly<Record<string, string | undefined>>, name: string): string | undefined {
  let value: string | undefined;
  for (const [key, candidate] of Object.entries(variables)) {
    if (key.toUpperCase() === name && candidate !== undefined) {
      value = candidate;
    }
  }
  return value;
}

/**
 * Splits a `;`-separated Windows list, dropping empty entries and surrounding quotes.
 *
 * @param list - The raw list.
 * @returns The non-empty entries.
 */
function splitWindowsList(list: string): readonly string[] {
  return list
    .split(";")
    .map((entry) => (entry.length > 1 && entry.startsWith('"') && entry.endsWith('"') ? entry.slice(1, -1) : entry))
    .filter((entry) => entry.length > 0);
}

/**
 * Resolves a bare command across `PATH` × `PATHEXT`, like `cmd.exe`.
 *
 * @param command - The bare command name.
 * @param variables - The environment variables of the child.
 * @param isFile - Whether a path is an existing file.
 * @returns The first existing candidate, or `undefined`.
 */
function resolveWindowsCommand(
  command: string,
  variables: Readonly<Record<string, string | undefined>>,
  isFile: (path: string) => boolean,
): string | undefined {
  const directories = splitWindowsList(readWindowsVariable(variables, "PATH") ?? "");
  const extensions = splitWindowsList(readWindowsVariable(variables, "PATHEXT") ?? DEFAULT_PATHEXT);
  const suffixes = win32.extname(command) === "" ? extensions : ["", ...extensions];

  for (const directory of directories) {
    for (const suffix of suffixes) {
      const candidate = win32.join(directory, `${command}${suffix}`);
      if (isFile(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * Decides how to spawn a request on the given platform.
 *
 * @param request - The command and arguments to run.
 * @param environment - The environment the child observes (its `variables` include overrides).
 * @param isFile - Whether a path is an existing file.
 * @returns The request unchanged with `shell: false` off Windows, for unresolved commands, for
 * path-qualified commands that are not batch files, and for resolved files that are neither batch
 * shims nor executables; the resolved path with `shell: false` for `.exe`/`.com`; the escaped
 * (resolved or path-qualified) command and escaped arguments with `shell: true` for `.cmd`/`.bat`.
 */
export function planSpawn(request: ProcessRequest, environment: EnvironmentSnapshot, isFile: (path: string) => boolean): SpawnPlan {
  const unchanged: SpawnPlan = {command: request.command, args: request.args, shell: false};
  if (environment.platform !== "win32") {
    return unchanged;
  }

  const shellPlan = (command: string): SpawnPlan => ({
    command: escapeCmdCommand(command),
    args: request.args.map((argument) => escapeCmdArgument(argument, true)),
    shell: true,
  });

  if (/[\\/]/u.test(request.command)) {
    return SHELL_EXTENSIONS.has(win32.extname(request.command).toLowerCase()) ? shellPlan(request.command) : unchanged;
  }

  const resolved = resolveWindowsCommand(request.command, environment.variables, isFile);
  if (resolved === undefined) {
    return unchanged;
  }

  const extension = win32.extname(resolved).toLowerCase();
  if (SHELL_EXTENSIONS.has(extension)) {
    return shellPlan(resolved);
  }
  if (DIRECT_EXTENSIONS.has(extension)) {
    return {command: resolved, args: request.args, shell: false};
  }
  return unchanged;
}
