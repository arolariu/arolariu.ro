// @vitest-environment node
/**
 * @fileoverview Read-only policy and contract tests for the modular doctor foundation.
 * @module scripts/doctor.readonly.test
 */

import {readdirSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it, vi} from "vitest";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";

const doctorTypesPath = resolve(process.cwd(), "scripts", "doctor.types.ts");
const doctorProductionExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

type AccessPath = readonly string[];
type AliasScope = Map<string, AccessPath | null>;

interface StaticUnknownValue {
  readonly kind: "unknown";
}

interface StaticStringValue {
  readonly kind: "string";
  readonly value: string;
}

interface StaticStringArrayValue {
  readonly kind: "stringArray";
  readonly value: readonly string[];
}

interface StaticObjectValue {
  readonly kind: "object";
  readonly properties: ReadonlyMap<string, StaticValue>;
  readonly hasUnresolvedSpread: boolean;
}

type StaticValue = StaticUnknownValue | StaticStringValue | StaticStringArrayValue | StaticObjectValue;

interface GuardScopeFrame {
  readonly aliases: AliasScope;
  readonly constants: Map<string, StaticValue>;
}

type CommandSpecExtraction =
  {readonly kind: "not-command"} | {readonly kind: "resolved"; readonly spec: Readonly<CommandSpec>} | {readonly kind: "unresolved"};

const UNKNOWN_STATIC_VALUE: StaticUnknownValue = {kind: "unknown"};
const NOT_A_COMMAND_SPEC: CommandSpecExtraction = {kind: "not-command"};
const UNRESOLVED_COMMAND_SPEC: CommandSpecExtraction = {kind: "unresolved"};

interface DoctorTypesModule {
  readonly DIAGNOSTIC_DEFAULT_TIMEOUT_MS: number;
  readonly DiagnosticPolicyError: new (message: string) => Error;
  readonly PYTHON_INTERPRETER_METADATA_SNIPPET: string;
  readonly createPortOwnerProbeCommand: (platform: NodeJS.Platform, ports: readonly number[]) => Readonly<CommandSpec>;
  readonly createReadOnlyDiagnosticRunner: (runner: CommandRunner) => {
    readonly run: (command: Readonly<CommandSpec>, options?: Readonly<Record<string, unknown>>) => Promise<CommandResult>;
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

function discoverDoctorProductionFiles(): readonly string[] {
  const doctorFiles = readdirSync(resolve(process.cwd(), "scripts"), {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.startsWith("doctor"))
    .map((entry) => `scripts/${entry.name}`.replaceAll("\\", "/"))
    .filter((fileName) => {
      const extension = fileName.slice(fileName.lastIndexOf("."));
      return doctorProductionExtensions.has(extension) && !/\.(?:spec|test)\.(?:cjs|js|mjs|ts)$/u.test(fileName);
    });

  // These pure shared modules are production dependencies of doctor specialists. Guard them
  // alongside the specialists so future filesystem writes or command dispatch cannot bypass
  // the doctor read-only boundary.
  const SHARED_PRODUCTION_FILES = ["scripts/common/taxonomy-artifacts.ts", "scripts/common/workspace-graph.ts"];

  return [...doctorFiles, ...SHARED_PRODUCTION_FILES].toSorted();
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }

  return null;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function getAccessPath(expression: ts.Expression, scopes: readonly GuardScopeFrame[]): AccessPath | null {
  const target = unwrapExpression(expression);

  if (ts.isIdentifier(target)) {
    for (let index = scopes.length - 1; index >= 0; index--) {
      const scope = scopes[index];
      if (scope?.aliases.has(target.text)) {
        return scope.aliases.get(target.text) ?? null;
      }
    }

    return [target.text];
  }

  if (ts.isPropertyAccessExpression(target)) {
    const receiver = getAccessPath(target.expression, scopes);
    return receiver === null ? null : [...receiver, target.name.text];
  }

  if (
    ts.isElementAccessExpression(target)
    && target.argumentExpression !== undefined
    && (ts.isStringLiteral(target.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(target.argumentExpression))
  ) {
    const receiver = getAccessPath(target.expression, scopes);
    return receiver === null ? null : [...receiver, target.argumentExpression.text];
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

function getStaticValue(name: string, scopes: readonly GuardScopeFrame[]): StaticValue | null {
  for (let index = scopes.length - 1; index >= 0; index--) {
    const scope = scopes[index];
    const value = scope?.constants.get(name);
    if (value !== undefined) {
      return value;
    }
  }

  return null;
}

function evaluateStaticObject(node: ts.ObjectLiteralExpression, scopes: readonly GuardScopeFrame[]): StaticObjectValue {
  const properties = new Map<string, StaticValue>();
  let hasUnresolvedSpread = false;

  for (const property of node.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spreadValue = evaluateStaticExpression(property.expression, scopes);
      if (spreadValue.kind !== "object") {
        hasUnresolvedSpread = true;
        continue;
      }

      for (const [propertyName, propertyValue] of spreadValue.properties) {
        properties.set(propertyName, propertyValue);
      }

      hasUnresolvedSpread ||= spreadValue.hasUnresolvedSpread;
      continue;
    }

    const propertyName = property.name !== undefined ? getPropertyNameText(property.name) : null;
    if (propertyName === null) {
      continue;
    }

    if (ts.isPropertyAssignment(property)) {
      properties.set(propertyName, evaluateStaticExpression(property.initializer, scopes));
      continue;
    }

    if (ts.isShorthandPropertyAssignment(property)) {
      properties.set(propertyName, evaluateStaticExpression(property.name, scopes));
      continue;
    }

    properties.set(propertyName, UNKNOWN_STATIC_VALUE);
  }

  return {
    kind: "object",
    properties,
    hasUnresolvedSpread,
  };
}

function evaluateStaticExpression(expression: ts.Expression, scopes: readonly GuardScopeFrame[]): StaticValue {
  const target = unwrapExpression(expression);

  if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) {
    return {kind: "string", value: target.text};
  }

  if (ts.isIdentifier(target)) {
    return getStaticValue(target.text, scopes) ?? UNKNOWN_STATIC_VALUE;
  }

  if (ts.isArrayLiteralExpression(target)) {
    const values: string[] = [];
    for (const element of target.elements) {
      if (ts.isSpreadElement(element)) {
        const spreadValue = evaluateStaticExpression(element.expression, scopes);
        if (spreadValue.kind !== "stringArray") {
          return UNKNOWN_STATIC_VALUE;
        }

        values.push(...spreadValue.value);
        continue;
      }

      const value = evaluateStaticExpression(element, scopes);
      if (value.kind !== "string") {
        return UNKNOWN_STATIC_VALUE;
      }

      values.push(value.value);
    }

    return {kind: "stringArray", value: values};
  }

  if (ts.isObjectLiteralExpression(target)) {
    return evaluateStaticObject(target, scopes);
  }

  if (ts.isPropertyAccessExpression(target)) {
    const receiver = evaluateStaticExpression(target.expression, scopes);
    if (receiver.kind !== "object") {
      return UNKNOWN_STATIC_VALUE;
    }

    return receiver.properties.get(target.name.text) ?? UNKNOWN_STATIC_VALUE;
  }

  if (
    ts.isElementAccessExpression(target)
    && target.argumentExpression !== undefined
    && (ts.isStringLiteral(target.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(target.argumentExpression))
  ) {
    const receiver = evaluateStaticExpression(target.expression, scopes);
    if (receiver.kind !== "object") {
      return UNKNOWN_STATIC_VALUE;
    }

    return receiver.properties.get(target.argumentExpression.text) ?? UNKNOWN_STATIC_VALUE;
  }

  return UNKNOWN_STATIC_VALUE;
}

function declareConstantBinding(name: ts.BindingName, scope: Map<string, StaticValue>, value: StaticValue): void {
  if (ts.isIdentifier(name)) {
    scope.set(name.text, value);
    return;
  }

  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isOmittedExpression(element)) {
        continue;
      }

      const propertyName = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : undefined);
      const propertyText = propertyName !== undefined ? getPropertyNameText(propertyName) : null;
      const propertyValue =
        propertyText !== null && value.kind === "object"
          ? (value.properties.get(propertyText) ?? UNKNOWN_STATIC_VALUE)
          : UNKNOWN_STATIC_VALUE;
      declareConstantBinding(element.name, scope, propertyValue);
    }

    return;
  }

  for (let index = 0; index < name.elements.length; index++) {
    const element = name.elements[index];
    if (element === undefined || ts.isOmittedExpression(element)) {
      continue;
    }

    const indexedValue = value.kind === "stringArray" ? value.value[index] : undefined;
    const elementValue: StaticValue =
      value.kind === "stringArray"
        ? element.dotDotDotToken === undefined
          ? indexedValue !== undefined
            ? ({kind: "string", value: indexedValue} satisfies StaticStringValue)
            : UNKNOWN_STATIC_VALUE
          : ({kind: "stringArray", value: value.value.slice(index)} satisfies StaticStringArrayValue)
        : UNKNOWN_STATIC_VALUE;
    declareConstantBinding(element.name, scope, elementValue);
  }
}

function isForbiddenOutputExpression(expression: ts.Expression, scopes: readonly GuardScopeFrame[]): boolean {
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

function extractCommandSpec(node: ts.ObjectLiteralExpression, scopes: readonly GuardScopeFrame[]): CommandSpecExtraction {
  const value = evaluateStaticExpression(node, scopes);
  if (value.kind !== "object") {
    return NOT_A_COMMAND_SPEC;
  }

  const commandValue = value.properties.get("command");
  const argsValue = value.properties.get("args");
  if (commandValue === undefined || argsValue === undefined) {
    return NOT_A_COMMAND_SPEC;
  }

  if (commandValue.kind === "string" && argsValue.kind === "stringArray" && !value.hasUnresolvedSpread) {
    return {
      kind: "resolved",
      spec: {
        command: commandValue.value,
        args: [...argsValue.value],
      },
    };
  }

  if (
    (commandValue.kind === "string" || commandValue.kind === "unknown")
    && (argsValue.kind === "stringArray" || argsValue.kind === "unknown")
  ) {
    return UNRESOLVED_COMMAND_SPEC;
  }

  return NOT_A_COMMAND_SPEC;
}

function isSetupModuleSpecifier(value: string): boolean {
  return /(?:^|[./\\])setup(?:[./\\-]|$)/u.test(value);
}

function isFsModuleSpecifier(value: string): boolean {
  return value === "fs" || value === "fs/promises" || value === "node:fs" || value === "node:fs/promises";
}

function isChildProcessModuleSpecifier(value: string): boolean {
  return value === "child_process" || value === "node:child_process";
}

const READ_ONLY_FS_IMPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    "fs",
    new Set([
      "accessSync",
      "constants",
      "existsSync",
      "lstatSync",
      "readFileSync",
      "readdirSync",
      "readlinkSync",
      "realpathSync",
      "statSync",
      "statfsSync",
    ]),
  ],
  [
    "node:fs",
    new Set([
      "accessSync",
      "constants",
      "existsSync",
      "lstatSync",
      "readFileSync",
      "readdirSync",
      "readlinkSync",
      "realpathSync",
      "statSync",
      "statfsSync",
    ]),
  ],
  ["fs/promises", new Set(["access", "lstat", "readFile", "readdir", "readlink", "realpath", "stat", "statfs"])],
  ["node:fs/promises", new Set(["access", "lstat", "readFile", "readdir", "readlink", "realpath", "stat", "statfs"])],
]);

const APPROVED_DOCTOR_REPOSITORY_IMPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    "scripts/doctor.ts",
    new Set([
      "./common/logger.ts",
      "./common/process.ts",
      "./common/repository-paths.ts",
      "./common/requirements.ts",
      "./doctor.diagnostics.ts",
      "./doctor.dotnet.ts",
      "./doctor.infrastructure.ts",
      "./doctor.python.ts",
      "./doctor.react.ts",
      "./doctor.reporter.ts",
      "./doctor.svelte.ts",
      "./doctor.types.ts",
      "./doctor.workspace.ts",
      "./inspection/probes.ts",
      "./inspection/repository.ts",
    ]),
  ],
  [
    "scripts/doctor.types.ts",
    new Set([
      "./common/logger.ts",
      "./common/process.ts",
      "./common/repository-paths.ts",
      "./common/requirements.ts",
      "./doctor.diagnostics.ts",
      "./inspection/probes.ts",
      "./inspection/repository.ts",
    ]),
  ],
  ["scripts/doctor.reporter.ts", new Set(["./common/logger.ts", "./doctor.diagnostics.ts", "./doctor.types.ts"])],
  ["scripts/doctor.diagnostics.ts", new Set(["./common/process.ts", "./doctor.types.ts"])],
  [
    "scripts/doctor.dotnet.ts",
    new Set([
      "./common/requirements.ts",
      "./doctor.diagnostics.ts",
      "./doctor.types.ts",
      "./inspection/dotnet.ts",
      "./inspection/types.ts",
    ]),
  ],
  [
    "scripts/doctor.infrastructure.ts",
    new Set([
      "./common/tooling-config.ts",
      "./container-runtime/selection.ts",
      "./container-runtime/types.ts",
      "./doctor.diagnostics.ts",
      "./doctor.types.ts",
      "./inspection/infrastructure.ts",
      "./inspection/types.ts",
    ]),
  ],
  [
    "scripts/doctor.python.ts",
    new Set(["./doctor.diagnostics.ts", "./doctor.types.ts", "./inspection/python.ts", "./inspection/types.ts"]),
  ],
  [
    "scripts/doctor.react.ts",
    new Set([
      "./doctor.diagnostics.ts",
      "./doctor.types.ts",
      "./inspection/frontend.ts",
      "./inspection/packages.ts",
      "./inspection/types.ts",
    ]),
  ],
  [
    "scripts/doctor.svelte.ts",
    new Set([
      "./common/requirements.ts",
      "./doctor.diagnostics.ts",
      "./doctor.types.ts",
      "./inspection/frontend.ts",
      "./inspection/types.ts",
    ]),
  ],
  [
    "scripts/doctor.workspace.ts",
    new Set([
      "./common/process.ts",
      "./common/requirements.ts",
      "./common/taxonomy-artifacts.ts",
      "./doctor.diagnostics.ts",
      "./doctor.types.ts",
      "./inspection/aggregate.ts",
      "./inspection/packages.ts",
      "./inspection/probes.ts",
      "./inspection/types.ts",
      "./inspection/workspace.ts",
    ]),
  ],
  ["scripts/common/taxonomy-artifacts.ts", new Set()],
  ["scripts/common/workspace-graph.ts", new Set()],
]);

function isApprovedDoctorRepositoryImport(fileName: string, moduleSpecifier: string): boolean {
  return APPROVED_DOCTOR_REPOSITORY_IMPORTS.get(fileName)?.has(moduleSpecifier) === true;
}

function isApprovedDynamicPortOwnerFactoryExpression(node: ts.ObjectLiteralExpression, fileName: string): boolean {
  if (fileName !== "scripts/doctor.types.ts") {
    return false;
  }

  let current: ts.Node | undefined = node.parent;
  while (
    current !== undefined
    && (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isSatisfiesExpression(current))
  ) {
    current = current.parent;
  }

  if (current === undefined || !ts.isReturnStatement(current)) {
    return false;
  }

  let owner: ts.Node | undefined = current.parent;
  while (owner !== undefined) {
    if (ts.isFunctionDeclaration(owner)) {
      return owner.name?.text === "createPortOwnerProbeCommand";
    }

    owner = owner.parent;
  }

  return false;
}

function findDoctorGuardViolations(
  sourceText: string,
  fileName: string,
  isReadOnlyDiagnosticCommand: (command: Readonly<CommandSpec>) => boolean,
): readonly string[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];
  const allowCommonProcessImports = fileName === "scripts/doctor.types.ts" || fileName === "scripts/doctor.ts";

  const report = (node: ts.Node, message: string): void => {
    const position = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push(`${fileName}:${position.line + 1}: ${message}`);
  };

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleSpecifier = statement.moduleSpecifier.text;
    const setupImport = isSetupModuleSpecifier(moduleSpecifier);
    if (setupImport) {
      report(statement, "setup import");
    }

    if (!allowCommonProcessImports && /(?:^|[./\\])common\/process\.ts$/u.test(moduleSpecifier.replaceAll("\\", "/"))) {
      if (statement.importClause?.namedBindings !== undefined && ts.isNamedImports(statement.importClause.namedBindings)) {
        for (const element of statement.importClause.namedBindings.elements) {
          if (
            element.propertyName?.text === "CommandRunner"
            || element.name.text === "CommandRunner"
            || element.name.text === "defaultCommandRunner"
          ) {
            report(element, "direct common CommandRunner use");
          }
        }
      }
    }

    if (isChildProcessModuleSpecifier(moduleSpecifier)) {
      report(statement, "child process import");
      continue;
    }

    if (isFsModuleSpecifier(moduleSpecifier)) {
      const importClause = statement.importClause;
      if (importClause?.name !== undefined) {
        report(importClause.name, "unrestricted fs import");
      }
      if (importClause?.namedBindings !== undefined) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          report(importClause.namedBindings, "unrestricted fs import");
        } else {
          const approvedImports = READ_ONLY_FS_IMPORTS.get(moduleSpecifier) ?? new Set<string>();
          for (const element of importClause.namedBindings.elements) {
            const importedName = element.propertyName?.text ?? element.name.text;
            if (!approvedImports.has(importedName)) {
              report(element, "mutating fs import");
            }
          }
        }
      }
      continue;
    }

    if (!moduleSpecifier.startsWith("node:") && !setupImport && !isApprovedDoctorRepositoryImport(fileName, moduleSpecifier)) {
      report(statement, "unapproved repository import");
    }
  }

  function visitFunction(node: ts.FunctionLikeDeclaration, scopes: readonly GuardScopeFrame[]): void {
    const functionScope: GuardScopeFrame = {
      aliases: new Map(),
      constants: new Map(),
    };

    if (node.name !== undefined && ts.isIdentifier(node.name)) {
      functionScope.aliases.set(node.name.text, null);
    }

    for (const parameter of node.parameters) {
      declareBindingName(parameter.name, functionScope.aliases, null);
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

  function visit(node: ts.Node, scopes: readonly GuardScopeFrame[]): void {
    if (ts.isSourceFile(node) || ts.isBlock(node)) {
      const blockScopes = [
        ...scopes,
        {
          aliases: new Map<string, AccessPath | null>(),
          constants: new Map<string, StaticValue>(),
        },
      ];

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
        declareBindingName(declaration.name, scope.aliases, accessPath);
        if (isConstant && declaration.initializer !== undefined) {
          declareConstantBinding(declaration.name, scope.constants, evaluateStaticExpression(declaration.initializer, scopes));
        }
      }
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (node.name !== undefined) {
        scope.aliases.set(node.name.text, null);
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
      scope.aliases.set(node.name.text, null);
    }

    if (ts.isCallExpression(node) && isForbiddenOutputExpression(node.expression, scopes)) {
      report(node, "direct output");
    }

    if (ts.isObjectLiteralExpression(node)) {
      const command = extractCommandSpec(node, scopes);
      if (
        !isApprovedDynamicPortOwnerFactoryExpression(node, fileName)
        && command.kind === "resolved"
        && !isReadOnlyDiagnosticCommand(command.spec)
      ) {
        report(node, "forbidden command specification");
      }

      if (!isApprovedDynamicPortOwnerFactoryExpression(node, fileName) && command.kind === "unresolved") {
        report(node, "unresolved command specification");
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
    expect(getExportedInterfacePropertyNames(source, "DoctorRunOptions")).toEqual(["quick", "verbose"]);
    expect(getExportedInterfacePropertyNames(source, "DoctorSummary")).toEqual(["passed", "warnings", "failed", "skipped"]);
    expect(getExportedInterfacePropertyNames(source, "DoctorReport")).toEqual(["score", "grade", "summary", "checks", "timestamp"]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticNetworkResult")).toEqual([
      "status",
      "statusCode",
      "durationMs",
      "error",
      "body",
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
      "inspection",
      "probes",
    ]);
    expect(getExportedInterfacePropertyNames(source, "DiagnosticModule")).toEqual(["id", "title", "run"]);
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
      {command: "npm", args: ["ls", "--all", "--json"]},
      {command: "npm", args: ["ls", "--json"]},
      {command: "npm", args: ["audit", "--json"]},
      {command: "npm", args: ["outdated", "--json"]},
      {command: "npm", args: ["config", "get", "cache"]},
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
      {command: "dotnet", args: ["nuget", "locals", "global-packages", "--list"]},
      {command: "dotnet", args: ["user-secrets", "list", "--project", "sites\\arolariu.ro"]},
      {
        command: "dotnet",
        args: ["user-secrets", "list", "--json", "--project", "tooling\\AppHost\\AppHost.csproj"],
      },
      {command: "dotnet", args: ["dev-certs", "https", "--check"]},
      {command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]},
      {command: "python", args: ["--version"]},
      {command: "python", args: ["-c", pythonMetadata]},
      {command: "python", args: ["-m", "pip", "--version"]},
      {command: "python", args: ["-m", "pip", "list", "--format", "json"]},
      {command: "python", args: ["-m", "pip", "check"]},
      {command: "py", args: ["-3.12", "--version"]},
      {command: "py", args: ["-3.12", "-c", pythonMetadata]},
      {command: "py", args: ["-3.12", "-m", "pip", "--version"]},
      {command: "py", args: ["-3.12", "-m", "pip", "list", "--format", "json"]},
      {command: "C:\\repo\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe", args: ["-c", pythonMetadata]},
      {command: "docker", args: ["--version"]},
      {command: "docker", args: ["version"]},
      {command: "docker", args: ["info"]},
      {command: "docker", args: ["info", "--format", "{{json .}}"]},
      {command: "docker", args: ["context", "show"]},
      {command: "docker", args: ["compose", "version"]},
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      {command: "podman", args: ["--version"]},
      {command: "podman", args: ["info", "--format", "json"]},
      {command: "podman", args: ["system", "connection", "list", "--format", "json"]},
      {command: "podman", args: ["machine", "list", "--format", "json"]},
      {command: "podman", args: ["compose", "version"]},
      {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]},
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

  it("uses the platform-specific fixed port-owner probes required by infrastructure diagnostics", async () => {
    const module = await loadDoctorTypesModule();

    expect(module.createPortOwnerProbeCommand("darwin", [3000, 4200])).toEqual({
      command: "sh",
      args: ["-c", 'for port in "$@"; do lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fpcn; done', "--", "3000", "4200"],
    });
    expect(module.createPortOwnerProbeCommand("linux", [3000, 4200])).toEqual({
      command: "sh",
      args: ["-c", 'for port in "$@"; do ss -ltnp "sport = :$port"; done', "--", "3000", "4200"],
    });
    // Regression proof: the Windows script must wrap the foreach statement's result with the
    // `$(...)` subexpression operator (a bare `foreach (...) { ... } | ConvertTo-Json` is
    // rejected by PowerShell with "An empty pipe element is not allowed.") and must wrap the
    // whole body in `& { ... }` so the caller's trailing argv binds to `$args`.
    const windowsProbe = module.createPortOwnerProbeCommand("win32", [3000, 4200]);
    expect(windowsProbe.command).toBe("powershell");
    expect(windowsProbe.args[3]).toContain("& {");
    expect(windowsProbe.args[3]).toContain("$(foreach ($port in $ports)");
    expect(windowsProbe.args[3]).not.toMatch(/\}\s*\|\s*ConvertTo-Json/u);
    expect(windowsProbe.args[3]).not.toContain("-ErrorAction Stop");
    expect(windowsProbe.args[4]).toBe("3000,4200");
  });

  it("rejects mutating, test-running, trust-broadening, and injection-shaped commands", async () => {
    const module = await loadDoctorTypesModule();

    const windowsProbeScript = module.createPortOwnerProbeCommand("win32", [3000]).args[3];
    expect(windowsProbeScript).toBeDefined();
    if (windowsProbeScript === undefined) throw new Error("Expected args[3] to be defined.");

    const forbidden: readonly Readonly<CommandSpec>[] = [
      {command: "npm", args: ["ci"]},
      {command: "dotnet", args: ["restore"]},
      {command: "dotnet", args: ["build"]},
      // Nx 23.1.1 always opens (and rewrites) its native workspace database under
      // NX_WORKSPACE_DATA_DIRECTORY when it constructs a project graph, so both former Nx
      // probes mutate gitignored local tooling state and are no longer read-only.
      {command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]},
      {command: "npx", args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"]},
      {command: "npx", args: ["tsc", "--noEmit"]},
      {command: "npx", args: ["svelte-check"]},
      {command: "npx", args: ["vitest", "run"]},
      {command: "npx", args: ["playwright", "install", "chromium"]},
      {command: "docker", args: ["start", "mssql"]},
      {command: "podman", args: ["rm", "container"]},
      {command: "dotnet", args: ["dev-certs", "https", "--trust"]},
      {
        command: "powershell",
        args: ["-NoProfile", "-NonInteractive", "-Command", windowsProbeScript, "3000; Remove-Item"],
      },
      {command: "which", args: ["node && rm -rf ."]},
    ];

    expect(forbidden.every((command) => !module.isReadOnlyDiagnosticCommand(command))).toBe(true);
  });
});

describe("PYTHON_INTERPRETER_METADATA_SNIPPET", () => {
  it("is a syntactically valid single Python -c argument whose dict literal contains no statement separators", async () => {
    const module = await loadDoctorTypesModule();
    const snippet = module.PYTHON_INTERPRETER_METADATA_SNIPPET;

    // Regression for a prior defect where the snippet's source lines were joined with "; ",
    // inserting a statement separator *inside* the dict literal passed to json.dumps({...}) and
    // producing invalid Python (e.g. "json.dumps({;   'executable': ...")). The dict literal
    // itself must never contain a semicolon.
    const dictLiteralMatch = /\{[^{}]*\}/u.exec(snippet);
    expect(dictLiteralMatch).not.toBeNull();
    expect(dictLiteralMatch?.[0]).not.toContain(";");

    // The snippet must remain a single compact statement sequence (an import followed by exactly
    // one print call), not a multi-statement chain reconstructed from embedded-newline joins.
    expect(snippet.match(/print\(/gu)).toHaveLength(1);
  });

  it("remains accepted by the exact read-only diagnostic command policy after correction", async () => {
    const module = await loadDoctorTypesModule();
    const snippet = module.PYTHON_INTERPRETER_METADATA_SNIPPET;

    expect(module.isReadOnlyDiagnosticCommand({command: "py", args: ["-3.12", "-c", snippet]})).toBe(true);
    expect(module.isReadOnlyDiagnosticCommand({command: "python3.12", args: ["-c", snippet]})).toBe(true);
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
      guarded.run({command: "node", args: ["--version"]}, {input: "secret"} as Readonly<Record<string, unknown>>),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);
    await expect(
      guarded.run({command: "node", args: ["--version"]}, {output: "inherit"} as Readonly<Record<string, unknown>>),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);
    await expect(
      guarded.run({command: "node", args: ["--version"]}, {output: "tee"} as Readonly<Record<string, unknown>>),
    ).rejects.toBeInstanceOf(module.DiagnosticPolicyError);

    expect(harness.run).not.toHaveBeenCalled();
  });
});

describe("doctor source-level read-only guard", () => {
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
      "scripts/doctor.react.ts:6: unapproved repository import",
      "scripts/doctor.react.ts:7: forbidden command specification",
      "scripts/doctor.react.ts:8: direct output",
      "scripts/doctor.react.ts:9: direct output",
    ]);
  });

  it("resolves representative command-spec indirection and fails closed on unresolved command specs", async () => {
    const module = await loadDoctorTypesModule();
    const source = [
      "const safeCommand = 'node';",
      "const safeArgs = ['--version'];",
      "const safeSpec = {command: safeCommand, args: safeArgs};",
      "const forbiddenCommand = 'npm';",
      "const forbiddenArgs = ['ci'];",
      "const forbiddenSpec = {command: forbiddenCommand, args: forbiddenArgs};",
      "const forbiddenTail = ['vitest', 'run'];",
      "const spreadSpec = {command: 'npx', args: [...forbiddenTail]};",
      "const helperCommand = 'dotnet';",
      "const helperArgs = ['restore'];",
      "const createForbiddenSpec = () => ({command: helperCommand, args: helperArgs});",
      "const helperSpec = createForbiddenSpec();",
      "const unresolvedSpec = {command: unknownCommand, args: ['ci']};",
      "const ordinaryObject = {command: 'palette', label: 'Launch'};",
      "const incompleteObject = {command: 'node'};",
    ].join("\n");

    expect(findDoctorGuardViolations(source, "scripts/doctor.workspace.ts", module.isReadOnlyDiagnosticCommand)).toEqual([
      "scripts/doctor.workspace.ts:6: forbidden command specification",
      "scripts/doctor.workspace.ts:8: forbidden command specification",
      "scripts/doctor.workspace.ts:11: forbidden command specification",
      "scripts/doctor.workspace.ts:13: unresolved command specification",
    ]);
  });

  it("rejects sync and stream mutations, unrestricted fs bindings, and child-process imports", async () => {
    const module = await loadDoctorTypesModule();
    const source = [
      'import fs from "node:fs";',
      'import * as fsPromises from "node:fs/promises";',
      'import {appendFileSync} from "node:fs";',
      'import {copyFileSync} from "node:fs";',
      'import {mkdirSync} from "node:fs";',
      'import {renameSync} from "node:fs";',
      'import {rmSync} from "node:fs";',
      'import {truncateSync} from "node:fs";',
      'import {unlinkSync} from "node:fs";',
      'import {writeFileSync} from "node:fs";',
      'import {createWriteStream} from "node:fs";',
      'import {spawn} from "node:child_process";',
      'import {constants, readFileSync} from "node:fs";',
      'import {access, readFile} from "node:fs/promises";',
    ].join("\n");

    expect(findDoctorGuardViolations(source, "scripts/doctor.react.ts", module.isReadOnlyDiagnosticCommand)).toEqual([
      "scripts/doctor.react.ts:1: unrestricted fs import",
      "scripts/doctor.react.ts:2: unrestricted fs import",
      "scripts/doctor.react.ts:3: mutating fs import",
      "scripts/doctor.react.ts:4: mutating fs import",
      "scripts/doctor.react.ts:5: mutating fs import",
      "scripts/doctor.react.ts:6: mutating fs import",
      "scripts/doctor.react.ts:7: mutating fs import",
      "scripts/doctor.react.ts:8: mutating fs import",
      "scripts/doctor.react.ts:9: mutating fs import",
      "scripts/doctor.react.ts:10: mutating fs import",
      "scripts/doctor.react.ts:11: mutating fs import",
      "scripts/doctor.react.ts:12: child process import",
    ]);
  });

  it("rejects repository imports outside the approved doctor surface", async () => {
    const module = await loadDoctorTypesModule();
    const source = ['import {diagnosticResult} from "./doctor.diagnostics.ts";', 'import {main} from "./generate.artifacts.ts";'].join(
      "\n",
    );

    expect(findDoctorGuardViolations(source, "scripts/doctor.react.ts", module.isReadOnlyDiagnosticCommand)).toEqual([
      "scripts/doctor.react.ts:2: unapproved repository import",
    ]);
  });

  it("includes each shared pure production dependency in the read-only guard set", () => {
    expect(discoverDoctorProductionFiles()).toEqual(
      expect.arrayContaining(["scripts/common/taxonomy-artifacts.ts", "scripts/common/workspace-graph.ts"]),
    );
  });

  it("keeps every doctor production file read-only compliant", async () => {
    const module = await loadDoctorTypesModule();

    const violations = discoverDoctorProductionFiles().flatMap((fileName) =>
      findDoctorGuardViolations(readFileSync(resolve(process.cwd(), fileName), "utf8"), fileName, module.isReadOnlyDiagnosticCommand),
    );

    expect(violations).toEqual([]);
  });
});
