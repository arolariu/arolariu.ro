// @vitest-environment node
/**
 * @fileoverview Read-only policy and contract tests for the modular doctor foundation.
 * @module scripts/doctor.readonly.test
 */

import {existsSync, readdirSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it, vi} from "vitest";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";

const doctorTypesPath = resolve(process.cwd(), "scripts", "doctor.types.ts");
const transitionalDoctorEntrypoints = new Set(["scripts/doctor.ts"]);
const doctorProductionExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

type AccessPath = readonly string[];
type AliasScope = Map<string, AccessPath | null>;

interface DoctorTypesModule {
  readonly DIAGNOSTIC_DEFAULT_TIMEOUT_MS: number;
  readonly DiagnosticPolicyError: new (message: string) => Error;
  readonly PYTHON_INTERPRETER_METADATA_SNIPPET: string;
  readonly createPortOwnerProbeCommand: (platform: NodeJS.Platform, ports: readonly number[]) => Readonly<CommandSpec>;
  readonly createReadOnlyDiagnosticRunner: (runner: CommandRunner) => {
    readonly run: (
      command: Readonly<CommandSpec>,
      options?: Readonly<Record<string, unknown>>,
    ) => Promise<CommandResult>;
  };
  readonly diagnosticResult: (
    result: Readonly<Record<string, unknown>>,
    startedAt: number,
    now: () => number,
  ) => Readonly<Record<string, unknown>>;
  readonly isReadOnlyDiagnosticCommand: (command: Readonly<CommandSpec>) => boolean;
  readonly skippedDiagnostic: (input: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>;
}

function createCommandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...overrides,
  };
}

function createRunnerHarness(result: CommandResult = createCommandResult()): Readonly<{
  runner: CommandRunner;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  const run = vi.fn<CommandRunner["run"]>(async () => result);
  return {
    runner: {run},
    run,
  };
}

async function loadDoctorTypesModule(): Promise<DoctorTypesModule> {
  const moduleUrl = new URL("./doctor.types.ts", import.meta.url).href;
  return (await import(moduleUrl)) as DoctorTypesModule;
}

function readDoctorTypesSourceFile(): ts.SourceFile {
  return ts.createSourceFile(doctorTypesPath, readFileSync(doctorTypesPath, "utf8"), ts.ScriptTarget.Latest, true);
}

function isExported(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ?? false
  );
}

function getExportedTypeAliasMembers(source: ts.SourceFile, name: string): readonly string[] {
  for (const statement of source.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || statement.name.text !== name || !isExported(statement)) {
      continue;
    }

    if (!ts.isUnionTypeNode(statement.type)) {
      throw new Error(`${name} must be a union type.`);
    }

    return statement.type.types.map((member) => {
      if (!ts.isLiteralTypeNode(member) || !ts.isStringLiteral(member.literal)) {
        throw new Error(`${name} must contain only string literal members.`);
      }

      return member.literal.text;
    });
  }

  throw new Error(`Missing exported type alias ${name}.`);
}

function getExportedInterfacePropertyNames(source: ts.SourceFile, name: string): readonly string[] {
  for (const statement of source.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== name || !isExported(statement)) {
      continue;
    }

    return statement.members.map((member) => {
      if (!ts.isPropertySignature(member) || member.name === undefined) {
        throw new Error(`${name} must contain only property signatures.`);
      }

      if (
        ts.isIdentifier(member.name)
        || ts.isStringLiteral(member.name)
        || ts.isNumericLiteral(member.name)
        || ts.isNoSubstitutionTemplateLiteral(member.name)
      ) {
        return member.name.text;
      }

      throw new Error(`${name} contains an unsupported property name.`);
    });
  }

  throw new Error(`Missing exported interface ${name}.`);
}

function getExportedInterfacePropertyType(source: ts.SourceFile, interfaceName: string, propertyName: string): string {
  for (const statement of source.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName || !isExported(statement)) {
      continue;
    }

    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined) {
        continue;
      }

      const name =
        ts.isIdentifier(member.name)
        || ts.isStringLiteral(member.name)
        || ts.isNumericLiteral(member.name)
        || ts.isNoSubstitutionTemplateLiteral(member.name)
          ? member.name.text
          : null;
      if (name === propertyName) {
        return member.type.getText(source).replaceAll(/\s+/gu, " ").trim();
      }
    }
  }

  throw new Error(`Missing property ${interfaceName}.${propertyName}.`);
}

function discoverDoctorProductionFiles(): readonly string[] {
  return readdirSync(resolve(process.cwd(), "scripts"), {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.startsWith("doctor"))
    .map((entry) => `scripts/${entry.name}`.replaceAll("\\", "/"))
    .filter((fileName) => {
      const extension = fileName.slice(fileName.lastIndexOf("."));
      return doctorProductionExtensions.has(extension) && !/\.(?:spec|test)\.(?:cjs|js|mjs|ts)$/u.test(fileName);
    })
    .toSorted();
}

function getAccessPath(expression: ts.Expression, scopes: readonly AliasScope[]): AccessPath | null {
  if (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isSatisfiesExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return getAccessPath(expression.expression, scopes);
  }

  if (ts.isIdentifier(expression)) {
    for (let index = scopes.length - 1; index >= 0; index--) {
      const scope = scopes[index];
      if (scope?.has(expression.text)) {
        return scope.get(expression.text) ?? null;
      }
    }

    return [expression.text];
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = getAccessPath(expression.expression, scopes);
    return receiver === null ? null : [...receiver, expression.name.text];
  }

  if (
    ts.isElementAccessExpression(expression)
    && (ts.isStringLiteral(expression.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression))
  ) {
    const receiver = getAccessPath(expression.expression, scopes);
    return receiver === null ? null : [...receiver, expression.argumentExpression.text];
  }

  return null;
}

function declareBindingName(name: ts.BindingName, scope: AliasScope, accessPath: AccessPath | null): void {
  if (ts.isIdentifier(name)) {
    scope.set(name.text, accessPath);
    return;
  }

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    let elementAccessPath: AccessPath | null = null;
    if (ts.isObjectBindingPattern(name) && element.dotDotDotToken === undefined && accessPath !== null) {
      const propertyName = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : undefined);
      if (
        propertyName !== undefined
        && (ts.isIdentifier(propertyName)
          || ts.isStringLiteral(propertyName)
          || ts.isNumericLiteral(propertyName)
          || ts.isNoSubstitutionTemplateLiteral(propertyName))
      ) {
        elementAccessPath = [...accessPath, propertyName.text];
      }
    }

    declareBindingName(element.name, scope, elementAccessPath);
  }
}

function isForbiddenOutputExpression(expression: ts.Expression, scopes: readonly AliasScope[]): boolean {
  const accessPath = getAccessPath(expression, scopes);
  if (accessPath === null) {
    return false;
  }

  if (accessPath.length === 2 && accessPath[0] === "console") {
    return true;
  }

  return (
    accessPath.length === 3
    && accessPath[0] === "process"
    && (accessPath[1] === "stdout" || accessPath[1] === "stderr")
    && accessPath[2] === "write"
  );
}

function extractCommandSpec(node: ts.ObjectLiteralExpression): Readonly<CommandSpec> | null {
  let command: string | null = null;
  let args: string[] | null = null;

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const propertyName =
      ts.isIdentifier(property.name)
      || ts.isStringLiteral(property.name)
      || ts.isNumericLiteral(property.name)
      || ts.isNoSubstitutionTemplateLiteral(property.name)
        ? property.name.text
        : null;
    if (propertyName === "command") {
      if (!ts.isStringLiteral(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
        return null;
      }

      command = property.initializer.text;
      continue;
    }

    if (propertyName === "args") {
      if (!ts.isArrayLiteralExpression(property.initializer)) {
        return null;
      }

      const literalArgs: string[] = [];
      for (const element of property.initializer.elements) {
        if (!ts.isStringLiteral(element) && !ts.isNoSubstitutionTemplateLiteral(element)) {
          return null;
        }

        literalArgs.push(element.text);
      }

      args = literalArgs;
    }
  }

  return command === null || args === null ? null : {command, args};
}

function isSetupModuleSpecifier(value: string): boolean {
  return /(?:^|[./\\])setup(?:[./\\-]|$)/u.test(value);
}

function isFsModuleSpecifier(value: string): boolean {
  return value === "node:fs" || value === "node:fs/promises";
}

function findDoctorGuardViolations(
  sourceText: string,
  fileName: string,
  isReadOnlyDiagnosticCommand: (command: Readonly<CommandSpec>) => boolean,
): readonly string[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];
  const mutatingFsImports = new Set(["appendFile", "copyFile", "mkdir", "rename", "rm", "truncate", "unlink", "writeFile"]);
  const allowCommonProcessImports = fileName === "scripts/doctor.types.ts";

  const report = (node: ts.Node, message: string): void => {
    const position = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push(`${fileName}:${position.line + 1}: ${message}`);
  };

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier.text;
    if (isSetupModuleSpecifier(moduleSpecifier)) {
      report(statement, "setup import");
    }

    if (!allowCommonProcessImports && /(?:^|[./\\])common\/process\.ts$/u.test(moduleSpecifier.replaceAll("\\", "/"))) {
      if (statement.importClause?.namedBindings !== undefined && ts.isNamedImports(statement.importClause.namedBindings)) {
        for (const element of statement.importClause.namedBindings.elements) {
          if (element.propertyName?.text === "CommandRunner" || element.name.text === "CommandRunner" || element.name.text === "defaultCommandRunner") {
            report(element, "direct common CommandRunner use");
          }
        }
      }
    }

    if (!isFsModuleSpecifier(moduleSpecifier)) {
      continue;
    }

    if (statement.importClause?.namedBindings !== undefined && ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const element of statement.importClause.namedBindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (mutatingFsImports.has(importedName)) {
          report(element, "mutating fs import");
        }
      }
    }
  }

  function visitFunction(node: ts.FunctionLikeDeclaration, scopes: readonly AliasScope[]): void {
    const functionScope: AliasScope = new Map();
    if (node.name !== undefined && ts.isIdentifier(node.name)) {
      functionScope.set(node.name.text, null);
    }
    for (const parameter of node.parameters) {
      declareBindingName(parameter.name, functionScope, null);
    }

    const functionScopes = [...scopes, functionScope];
    for (const parameter of node.parameters) {
      if (parameter.initializer !== undefined) {
        visit(parameter.initializer, functionScopes);
      }
    }
    if (node.body !== undefined) {
      visit(node.body, functionScopes);
    }
  }

  function visit(node: ts.Node, scopes: readonly AliasScope[]): void {
    if (ts.isSourceFile(node) || ts.isBlock(node)) {
      const blockScopes = [...scopes, new Map<string, AccessPath | null>()];
      for (const statement of node.statements) {
        visit(statement, blockScopes);
      }
      return;
    }

    const scope = scopes.at(-1);
    if (scope === undefined) {
      throw new Error("Doctor read-only guard traversal requires an active lexical scope.");
    }

    if (ts.isVariableDeclarationList(node)) {
      const isConstant = (node.flags & ts.NodeFlags.Const) !== 0;
      for (const declaration of node.declarations) {
        if (declaration.initializer !== undefined) {
          visit(declaration.initializer, scopes);
        }
        const accessPath = isConstant && declaration.initializer !== undefined ? getAccessPath(declaration.initializer, scopes) : null;
        declareBindingName(declaration.name, scope, accessPath);
      }
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (node.name !== undefined) {
        scope.set(node.name.text, null);
      }
      visitFunction(node, scopes);
      return;
    }

    if (
      ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isMethodDeclaration(node)
      || ts.isConstructorDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node)
    ) {
      visitFunction(node, scopes);
      return;
    }

    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      scope.set(node.name.text, null);
    }

    if (ts.isCallExpression(node) && isForbiddenOutputExpression(node.expression, scopes)) {
      report(node, "direct output");
    }

    if (ts.isObjectLiteralExpression(node)) {
      const command = extractCommandSpec(node);
      if (command !== null && !isReadOnlyDiagnosticCommand(command)) {
        report(node, "forbidden command specification");
      }
    }

    ts.forEachChild(node, (child) => visit(child, scopes));
  }

  visit(source, []);
  return violations;
}

describe("doctor diagnostic contracts", () => {
  it("declares the required exported union members and interface keys", () => {
    const source = readDoctorTypesSourceFile();

    expect(getExportedTypeAliasMembers(source, "DiagnosticStatus")).toEqual(["pass", "warn", "fail", "skipped"]);
    expect(getExportedTypeAliasMembers(source, "DiagnosticConfidence")).toEqual(["high", "medium", "low"]);
    expect(getExportedTypeAliasMembers(source, "DiagnosticModuleId")).toEqual([
      "workspace",
      "dotnet",
      "react",
      "svelte",
      "python",
      "infrastructure",
    ]);

    expect(getExportedInterfacePropertyNames(source, "DiagnosticPotentialCause")).toEqual(["cause", "confidence"]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticFix")).toEqual(["description", "command"]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticResult")).toEqual([
      "id",
      "module",
      "name",
      "status",
      "summary",
      "evidence",
      "rootCause",
      "potentialCauses",
      "fixes",
      "durationMs",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DoctorOptions")).toEqual([
      "verbose",
      "ci",
      "score",
      "json",
      "quick",
      "help",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DoctorSummary")).toEqual(["passed", "warnings", "failed", "skipped"]);
    expect(getExportedInterfacePropertyNames(source, "DoctorReportV1")).toEqual([
      "schemaVersion",
      "score",
      "grade",
      "summary",
      "checks",
      "timestamp",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticNetworkResult")).toEqual([
      "status",
      "statusCode",
      "durationMs",
      "error",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DoctorContext")).toEqual([
      "options",
      "paths",
      "requirements",
      "runner",
      "network",
      "logger",
      "platform",
      "arch",
      "env",
      "now",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticModule")).toEqual(["id", "title", "run"]);
    expect(getExportedInterfacePropertyType(source, "DoctorReportV1", "schemaVersion")).toBe("1");
  });

  it("builds skipped diagnostics and elapsed results from the shared helpers", async () => {
    const module = await loadDoctorTypesModule();

    expect(
      module.skippedDiagnostic({
        id: "workspace.sample",
        module: "workspace",
        name: "Workspace sample",
        summary: "Skipped in CI.",
        evidence: ["CI mode enabled."],
      }),
    ).toEqual({
      id: "workspace.sample",
      module: "workspace",
      name: "Workspace sample",
      status: "skipped",
      summary: "Skipped in CI.",
      evidence: ["CI mode enabled."],
      potentialCauses: [],
      fixes: [],
      durationMs: 0,
    });

    expect(
      module.diagnosticResult(
        {
          id: "workspace.sample",
          module: "workspace",
          name: "Workspace sample",
          status: "pass",
          summary: "Healthy.",
          evidence: ["All checks passed."],
          potentialCauses: [],
          fixes: [],
        },
        10,
        () => 17,
      ),
    ).toEqual({
      id: "workspace.sample",
      module: "workspace",
      name: "Workspace sample",
      status: "pass",
      summary: "Healthy.",
      evidence: ["All checks passed."],
      potentialCauses: [],
      fixes: [],
      durationMs: 7,
    });
  });
});

describe("isReadOnlyDiagnosticCommand", () => {
  it("accepts the approved read-only inventory, metadata, and probe commands", async () => {
    const module = await loadDoctorTypesModule();
    const pythonMetadata = module.PYTHON_INTERPRETER_METADATA_SNIPPET;

    const allowed = [
      {command: "node", args: ["--version"]},
      {command: "npm", args: ["--version"]},
      {command: "npm", args: ["ls", "--json"]},
      {command: "npm", args: ["audit", "--json"]},
      {command: "npm", args: ["outdated", "--json"]},
      {command: "npm", args: ["config", "get", "cache"]},
      {command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]},
      {command: "npx", args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"]},
      {command: "npx", args: ["--no-install", "playwright", "install", "--list"]},
      {command: "git", args: ["--version"]},
      {command: "git", args: ["status", "--short", "--branch"]},
      {command: "git", args: ["log", "--oneline", "-1", "HEAD"]},
      {command: "git", args: ["rev-parse", "--show-toplevel"]},
      {command: "dotnet", args: ["--version"]},
      {command: "dotnet", args: ["--info"]},
      {command: "dotnet", args: ["--list-sdks"]},
      {command: "dotnet", args: ["--list-runtimes"]},
      {command: "dotnet", args: ["workload", "list"]},
      {command: "dotnet", args: ["tool", "list", "--local"]},
      {command: "dotnet", args: ["tool", "list", "--global"]},
      {command: "dotnet", args: ["nuget", "list", "source"]},
      {command: "dotnet", args: ["user-secrets", "list", "--project", "sites\\arolariu.ro"]},
      {command: "dotnet", args: ["dev-certs", "https", "--check"]},
      {command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]},
      {command: "python", args: ["--version"]},
      {command: "python", args: ["-c", pythonMetadata]},
      {command: "python", args: ["-m", "pip", "list", "--format", "json"]},
      {command: "python", args: ["-m", "pip", "check"]},
      {command: "py", args: ["-3.12", "--version"]},
      {command: "py", args: ["-3.12", "-c", pythonMetadata]},
      {command: "py", args: ["-3.12", "-m", "pip", "list", "--format", "json"]},
      {command: "C:\\repo\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe", args: ["-c", pythonMetadata]},
      {command: "docker", args: ["--version"]},
      {command: "docker", args: ["version"]},
      {command: "docker", args: ["info", "--format", "{{json .}}"]},
      {command: "docker", args: ["context", "show"]},
      {command: "docker", args: ["compose", "version"]},
      {command: "docker", args: ["ps", "--format", "{{.Names}}\t{{.Ports}}"]},
      {command: "podman", args: ["--version"]},
      {command: "podman", args: ["info", "--format", "json"]},
      {command: "podman", args: ["system", "connection", "list", "--format", "json"]},
      {command: "podman", args: ["compose", "version"]},
      {command: "podman", args: ["ps", "--format", "{{.Names}}\t{{.Ports}}"]},
      {command: "mkcert", args: ["--version"]},
      {command: "mkcert", args: ["-CAROOT"]},
      {command: "df", args: ["-Pk"]},
      {command: "lsof", args: ["-nP", "-iTCP", "-sTCP:LISTEN"]},
      {command: "ps", args: ["-eo", "pid=,comm="]},
      {command: "which", args: ["node"]},
      {command: "where.exe", args: ["node.exe"]},
      module.createPortOwnerProbeCommand("win32", [3000, 4200]),
      module.createPortOwnerProbeCommand("linux", [3000, 4200]),
      module.createPortOwnerProbeCommand("darwin", [3000, 4200]),
    ] as const;

    expect(allowed.every((command) => module.isReadOnlyDiagnosticCommand(command))).toBe(true);
  });

  it("rejects mutating, test-running, trust-broadening, and injection-shaped commands", async () => {
    const module = await loadDoctorTypesModule();

    const forbidden = [
      {command: "npm", args: ["ci"]},
      {command: "dotnet", args: ["restore"]},
      {command: "dotnet", args: ["build"]},
      {command: "npx", args: ["tsc", "--noEmit"]},
      {command: "npx", args: ["svelte-check"]},
      {command: "npx", args: ["vitest", "run"]},
      {command: "npx", args: ["playwright", "install", "chromium"]},
      {command: "docker", args: ["start", "mssql"]},
      {command: "podman", args: ["rm", "container"]},
      {command: "dotnet", args: ["dev-certs", "https", "--trust"]},
      {
        command: "powershell",
        args: [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "$ports = @($args[0] -split ','); foreach ($port in $ports) { Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object LocalAddress, LocalPort, OwningProcess } | ConvertTo-Json -Compress",
          "3000; Remove-Item",
        ],
      },
      {command: "which", args: ["node && rm -rf ."]},
    ] as const;

    expect(forbidden.every((command) => !module.isReadOnlyDiagnosticCommand(command))).toBe(true);
  });
});

describe("createReadOnlyDiagnosticRunner", () => {
  it("rejects a forbidden command before delegating to the underlying runner", async () => {
    const module = await loadDoctorTypesModule();
    const harness = createRunnerHarness();
    const guarded = module.createReadOnlyDiagnosticRunner(harness.runner);

    await expect(guarded.run({command: "npm", args: ["ci"]})).rejects.toBeInstanceOf(module.DiagnosticPolicyError);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("forces captured output, preserves stdout and stderr, and applies the shared default timeout", async () => {
    const module = await loadDoctorTypesModule();
    const harness = createRunnerHarness(createCommandResult({code: 7, stdout: "json", stderr: "detail"}));
    const guarded = module.createReadOnlyDiagnosticRunner(harness.runner);

    await expect(guarded.run({command: "node", args: ["--version"]})).resolves.toEqual(
      createCommandResult({code: 7, stdout: "json", stderr: "detail"}),
    );

    expect(harness.run).toHaveBeenCalledWith(
      {command: "node", args: ["--version"]},
      expect.objectContaining({
        output: "capture",
        timeoutMs: module.DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
      }),
    );
  });

  it("passes through approved cwd, env, signal, and explicit timeout options", async () => {
    const module = await loadDoctorTypesModule();
    const harness = createRunnerHarness();
    const guarded = module.createReadOnlyDiagnosticRunner(harness.runner);
    const controller = new AbortController();

    await guarded.run(
      {command: "git", args: ["rev-parse", "--show-toplevel"]},
      {
        cwd: "C:\\repo",
        env: {CI: "true"},
        signal: controller.signal,
        timeoutMs: 321,
      },
    );

    expect(harness.run).toHaveBeenCalledWith(
      {command: "git", args: ["rev-parse", "--show-toplevel"]},
      {
        cwd: "C:\\repo",
        env: {CI: "true"},
        signal: controller.signal,
        timeoutMs: 321,
        output: "capture",
      },
    );
  });

  it("rejects caller-supplied stdin and non-capture output modes before delegation", async () => {
    const module = await loadDoctorTypesModule();
    const harness = createRunnerHarness();
    const guarded = module.createReadOnlyDiagnosticRunner(harness.runner);

    await expect(
      guarded.run(
        {command: "node", args: ["--version"]},
        {input: "secret"} as Readonly<Record<string, unknown>>,
      ),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);
    await expect(
      guarded.run(
        {command: "node", args: ["--version"]},
        {output: "inherit"} as Readonly<Record<string, unknown>>,
      ),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);
    await expect(
      guarded.run(
        {command: "node", args: ["--version"]},
        {output: "tee"} as Readonly<Record<string, unknown>>,
      ),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);

    expect(harness.run).not.toHaveBeenCalled();
  });
});

describe("doctor source-level read-only guard", () => {
  it("anchors only the temporary legacy doctor exemption", () => {
    expect([...transitionalDoctorEntrypoints]).toEqual(["scripts/doctor.ts"]);
    expect([...transitionalDoctorEntrypoints].filter((fileName) => !existsSync(fileName))).toEqual([]);
  });

  it("detects real policy violations without matching comments or strings", async () => {
    const module = await loadDoctorTypesModule();
    const source = [
      "// import {writeFile} from 'node:fs/promises';",
      "const example = \"console.log('string')\";",
      "const commandText = \"{command: 'npm', args: ['ci']}\";",
      "import {writeFile} from 'node:fs/promises';",
      "import {runSetup} from './setup.ts';",
      "import {type CommandRunner} from './common/process.ts';",
      "const forbidden = {command: 'npm', args: ['ci']};",
      "console.log('output');",
      "process.stderr.write('error');",
    ].join("\n");

    expect(findDoctorGuardViolations(source, "scripts/doctor.react.ts", module.isReadOnlyDiagnosticCommand)).toEqual([
      "scripts/doctor.react.ts:4: mutating fs import",
      "scripts/doctor.react.ts:5: setup import",
      "scripts/doctor.react.ts:6: direct common CommandRunner use",
      "scripts/doctor.react.ts:7: forbidden command specification",
      "scripts/doctor.react.ts:8: direct output",
      "scripts/doctor.react.ts:9: direct output",
    ]);
  });

  it("keeps every non-legacy doctor production file read-only compliant", async () => {
    const module = await loadDoctorTypesModule();

    const violations = discoverDoctorProductionFiles()
      .filter((fileName) => !transitionalDoctorEntrypoints.has(fileName))
      .flatMap((fileName) =>
        findDoctorGuardViolations(
          readFileSync(resolve(process.cwd(), fileName), "utf8"),
          fileName,
          module.isReadOnlyDiagnosticCommand,
        ),
      );

    expect(violations).toEqual([]);
  });
});
