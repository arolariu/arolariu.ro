import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {builtinModules} from "node:module";

import {Effect} from "effect";
import ts from "typescript";

import type {PlatformServices} from "./layers.ts";
import {Process, type ProcessError} from "./Process.ts";

/** Independently selectable development environments. */
export type DevcontainerFlavor = "exp" | "api" | "components" | "website" | "cv-docs-status";

/** Observable result of executing an actual preparation hook. */
export interface PreparationResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Owned test checkout with controlled external installers. */
export interface PreparationFixture {
  readonly root: string;
  readonly home: string;
  readonly events: () => readonly string[];
  readonly run: (environment?: Readonly<Record<string, string>>) => Effect.Effect<PreparationResult, ProcessError, PlatformServices>;
  readonly dispose: () => void;
}

const repositoryRoot = resolve(import.meta.dirname, "../..");

function installedNpmCli(): string {
  const inheritedCli = process.env["npm_execpath"];
  const candidates = [
    ...(inheritedCli === undefined ? [] : [join(dirname(inheritedCli), "npm-cli.js")]),
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ];
  const cli = candidates.find((candidate) => existsSync(candidate));
  if (cli === undefined) throw new Error("The installed npm CLI could not be located.");
  return cli;
}

/** Walks the entrypoint's load-time value imports and re-exports, excluding erased types and Node built-ins. */
export function runtimePackageNames(entrypoint: string): ReadonlySet<string> {
  const visited = new Set<string>();
  const packages = new Set<string>();
  const pending = [resolve(entrypoint)];
  for (const file of pending) {
    if (visited.has(file) || file.endsWith(".json")) continue;
    visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (specifier === undefined || !ts.isStringLiteral(specifier)) continue;
      const clause = ts.isImportDeclaration(statement) ? statement.importClause : undefined;
      if (clause?.isTypeOnly || (ts.isExportDeclaration(statement) && statement.isTypeOnly)) continue;
      const bindings = clause?.namedBindings ?? (ts.isExportDeclaration(statement) ? statement.exportClause : undefined);
      if (
        clause?.name === undefined
        && bindings !== undefined
        && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))
        && bindings.elements.length > 0
        && bindings.elements.every((item) => item.isTypeOnly)
      ) {
        continue;
      }
      const name = specifier.text;
      if (name.startsWith("node:") || builtinModules.includes(name)) continue;
      if (name.startsWith(".")) {
        const module = ts.resolveModuleName(
          name,
          file,
          {
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            module: ts.ModuleKind.NodeNext,
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
          },
          ts.sys,
        ).resolvedModule;
        if (module === undefined) throw new Error(`Unresolved runtime import '${name}' in ${file}.`);
        pending.push(module.resolvedFileName);
      } else {
        packages.add(
          name
            .split("/")
            .slice(0, name.startsWith("@") ? 2 : 1)
            .join("/"),
        );
      }
    }
  }
  return packages;
}

function collectPackageNames(value: unknown, names: Set<string>): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid npm dependency node.");
  if (!("dependencies" in value)) return;
  const dependencies = value.dependencies;
  if (typeof dependencies !== "object" || dependencies === null || Array.isArray(dependencies)) {
    throw new Error("Invalid npm dependency map.");
  }
  for (const [name, dependency] of Object.entries(dependencies)) {
    names.add(name);
    collectPackageNames(dependency, names);
  }
}

/** Uses npm's lockfile-only workspace tree to identify packages supplied by the same filtered install as the flavor. */
export function filteredWorkspacePackageNames(
  workspaces: readonly string[],
): Effect.Effect<ReadonlySet<string>, ProcessError, PlatformServices> {
  return Effect.gen(function* () {
    const runner = yield* Process;
    const result = yield* runner.run(
      {
        command: process.execPath,
        args: [
          installedNpmCli(),
          "ls",
          "--all",
          "--package-lock-only",
          ...workspaces.flatMap((workspace) => ["--workspace", workspace]),
          "--include-workspace-root=false",
          "--json",
          "--offline",
        ],
      },
      {
        cwd: repositoryRoot,
        env: {NPM_CONFIG_UPDATE_NOTIFIER: "false"},
        timeout: "30 seconds",
        failureOutput: "full",
      },
    );
    const value: unknown = JSON.parse(result.stdout);
    const names = new Set<string>();
    collectPackageNames(value, names);
    return names;
  });
}

function bashPath(path: string): string {
  return process.platform === "win32"
    ? path.replaceAll("\\", "/").replace(/^([a-z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`)
    : path;
}

/** Reads a definition without replacing an absent artifact with a valid-looking configuration. */
export function readDevcontainer(flavor: DevcontainerFlavor): unknown {
  const path = join(repositoryRoot, ".devcontainer", flavor, "devcontainer.json");
  if (!existsSync(path)) return undefined;
  const definition: unknown = JSON.parse(readFileSync(path, "utf8"));
  return definition;
}

/** Resolves the mount destinations the devcontainer consumer will receive. */
export function devcontainerMountTargets(definition: unknown): readonly string[] {
  if (typeof definition !== "object" || definition === null || !("mounts" in definition) || !Array.isArray(definition.mounts)) {
    throw new Error("The definition must declare its dependency mounts.");
  }
  return definition.mounts.map((mount: unknown) => {
    if (typeof mount !== "string") throw new Error("Expected an explicit mount declaration.");
    const target = mount.split(",").find((field) => field.startsWith("target="));
    if (target === undefined) throw new Error("A dependency mount has no destination.");
    return target.slice("target=".length);
  });
}

/** Runs the installed npm against an isolated fixture, never the source checkout. */
export function runFixtureNpm(
  fixture: PreparationFixture,
  args: readonly string[],
): Effect.Effect<PreparationResult, ProcessError, PlatformServices> {
  return Effect.gen(function* () {
    const runner = yield* Process;
    const result = yield* runner.run(
      {command: process.execPath, args: [installedNpmCli(), ...args]},
      {
        cwd: fixture.root,
        env: {
          TEST_HOOK_TRACE: join(fixture.root, "workspace-hooks.log"),
          NPM_CONFIG_UPDATE_NOTIFIER: "false",
        },
        timeout: "20 seconds",
        failureOutput: "full",
      },
    );
    return {status: 0, stdout: result.stdout, stderr: result.stderr};
  });
}

/** Creates an isolated checkout that runs the real hook against external-command doubles. */
export function createPreparationFixture(flavor: DevcontainerFlavor, linkedCheckout = false): PreparationFixture {
  const source = join(repositoryRoot, ".devcontainer", flavor, "postCreate.sh");
  if (!existsSync(source)) throw new Error(`Missing ${flavor} preparation hook.`);

  const root = mkdtempSync(join(tmpdir(), "arolariu-devcontainer test-"));
  const home = join(root, "home");
  const bin = join(root, "bin");
  const trace = join(root, "commands.log");
  const script = join(root, ".devcontainer", flavor, "postCreate.sh");
  mkdirSync(dirname(script), {recursive: true});
  mkdirSync(bin, {recursive: true});
  writeFileSync(script, readFileSync(source, "utf8"));
  const checkout = linkedCheckout ? join(root, "checkout-link") : root;
  if (linkedCheckout) symlinkSync(root, checkout, process.platform === "win32" ? "junction" : "dir");
  writeFileSync(join(root, "package.json"), JSON.stringify({name: "fixture", private: true, workspaces: ["sites/*", "packages/*"]}));

  for (const directory of [".cache/exp-venv", ".cache/pip", ".cache/npm", ".cache/api-dotnet", ".nuget/packages"])
    mkdirSync(join(home, directory), {recursive: true});

  for (const [directory, name] of [
    ["sites/cv.arolariu.ro", "@arolariu/cv"],
    ["sites/docs.arolariu.ro", "@arolariu/docs"],
    ["sites/status.arolariu.ro", "@arolariu/status"],
    ["sites/arolariu.ro", "@arolariu/website"],
    ["packages/components", "@arolariu/components"],
  ]) {
    if (directory === undefined || name === undefined) throw new Error("Invalid workspace fixture.");
    mkdirSync(join(root, directory, "node_modules"), {recursive: true});
    writeFileSync(join(root, directory, "package.json"), JSON.stringify({name, version: "1.0.0", private: true}));
  }
  mkdirSync(join(root, "node_modules"), {recursive: true});
  mkdirSync(join(root, "sites", "api.arolariu.ro"), {recursive: true});
  mkdirSync(join(root, "sites", "exp.arolariu.ro"), {recursive: true});
  writeFileSync(join(root, "sites", "exp.arolariu.ro", "requirements-dev.txt"), "-r requirements.txt\n");

  const record = (name: string): string => `printf '${name}' >> "$TRACE"\nprintf '\\t%s' "$@" >> "$TRACE"\nprintf '\\n' >> "$TRACE"\n`;
  const stub = (name: string, body: string): void => {
    writeFileSync(join(bin, name), `#!/usr/bin/env bash\nset -euo pipefail\n${body}`, {mode: 0o755});
  };
  stub("mountpoint", `${record("mountpoint")}[[ "\${FAIL_MOUNT:-}" != "1" ]]\n`);
  stub("sudo", `${record("sudo")}exit 0\n`);
  stub(
    "python3",
    `${record("python3")}
if [[ "\${1:-}" == "--version" ]]; then echo "Python 3.12.0"; exit 0; fi
if [[ "\${1:-}" == "-m" && "\${2:-}" == "venv" ]]; then
  mkdir -p "$3/bin"
  cp "$FAKE_BIN/venv-python" "$3/bin/python"
  chmod u+x "$3/bin/python"
fi
`,
  );
  stub(
    "venv-python",
    `${record("venv-python")}
if [[ "\${FAIL_COMMAND:-}" == "pip" ]]; then echo "controlled pip failure" >&2; exit 17; fi
`,
  );
  for (const name of ["npm", "dotnet"]) {
    stub(
      name,
      `${record(name)}
if [[ "\${1:-}" == "--version" ]]; then echo "${name === "npm" ? "11.16.0" : "10.0.100"}"; exit 0; fi
if [[ "\${FAIL_COMMAND:-}" == "${name}" ]]; then echo "controlled ${name} failure" >&2; exit 17; fi
${name === "npm" ? 'if [[ "${FAIL_COMMAND:-}" == "svelte" && "${1:-}" == "exec" ]]; then echo "controlled svelte failure" >&2; exit 17; fi' : ""}
`,
    );
  }
  stub(
    "node",
    `${record("node")}
if [[ "\${1:-}" == "--input-type=module" ]]; then exec "$REAL_NODE" "$@"; fi
if [[ "\${1:-}" == */scripts/cli.ts && "\${2:-}" == "generate" && "\${3:-}" == "--website-licenses-only" ]]; then exit 0; fi
echo "Unexpected node invocation in preparation fixture" >&2
exit 19
`,
  );

  const bash = process.platform === "win32" ? join(process.env["ProgramFiles"] ?? "C:\\Program Files", "Git", "bin", "bash.exe") : "bash";

  return {
    root,
    home,
    events: () => (existsSync(trace) ? readFileSync(trace, "utf8").trim().split(/\r?\n/).filter(Boolean) : []),
    run: (environment = {}) =>
      Effect.gen(function* () {
        const runner = yield* Process;
        return yield* runner
          .run(
            {
              command: bash,
              args: ["--noprofile", "--norc", "-c", 'export PATH="$FAKE_BIN:$PATH"; exec "$BASH" "$PREP_SCRIPT"'],
            },
            {
              cwd: root,
              env: {
                HOME: bashPath(home),
                FAKE_BIN: bashPath(bin),
                PREP_SCRIPT: bashPath(join(checkout, ".devcontainer", flavor, "postCreate.sh")),
                TRACE: bashPath(trace),
                REAL_NODE: bashPath(process.execPath),
                BASH_ENV: "/dev/null",
                FAIL_COMMAND: "",
                FAIL_MOUNT: "",
                ...environment,
              },
              timeout: "10 seconds",
              failureOutput: "full",
            },
          )
          .pipe(
            Effect.map((result): PreparationResult => ({status: 0, stdout: result.stdout, stderr: result.stderr})),
            Effect.catchTag("ProcessExited", (error) =>
              Effect.succeed({status: error.exitCode, stdout: error.stdout, stderr: error.stderr}),
            ),
          );
      }),
    dispose: () => {
      if (linkedCheckout) unlinkSync(checkout);
      rmSync(root, {recursive: true, force: true});
    },
  };
}
