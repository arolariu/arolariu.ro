import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {legacyClientModule, legacyServerModule, skippedPathSegments} from "./types.ts";

const forbiddenClientImports = new Set(["useTranslations", "createTranslator"]);
const forbiddenServerImports = new Set(["getTranslations"]);
const workspaceRoot = findWorkspaceRoot(process.cwd());
const websiteRoot = path.join(workspaceRoot, "sites", "arolariu.ro");

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = startDirectory;
  while (!fs.existsSync(path.join(currentDirectory, "package.json")) || !fs.existsSync(path.join(currentDirectory, "sites", "arolariu.ro"))) {
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error("Could not locate repository root for next-intl-selector import guard.");
    }

    currentDirectory = parentDirectory;
  }

  return currentDirectory;
}

function collectFiles(directory: string): string[] {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    if (!/\.(ts|tsx)$/u.test(fullPath)) return [];
    if (skippedPathSegments.some((segment) => fullPath.includes(segment))) return [];
    return [fullPath];
  });
}

function getForbiddenImports(fileName: string): string[] {
  const source = fs.readFileSync(fileName, "utf8");
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const failures: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const moduleName = statement.moduleSpecifier.text;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;
    if (!ts.isNamedImports(bindings)) continue;
    const forbidden = moduleName === legacyClientModule ? forbiddenClientImports : moduleName === legacyServerModule ? forbiddenServerImports : undefined;
    if (!forbidden) continue;

    for (const element of bindings.elements) {
      if (forbidden.has(element.name.text)) {
        const line = sourceFile.getLineAndCharacterOfPosition(element.name.getStart(sourceFile)).line + 1;
        failures.push(`${path.relative(workspaceRoot, fileName)}:${line} imports ${element.name.text} from ${moduleName}`);
      }
    }
  }

  return failures;
}

const failures = collectFiles(websiteRoot).flatMap(getForbiddenImports);
if (failures.length > 0) {
  console.error("[next-intl-selector] Legacy translator imports remain:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.info("[next-intl-selector] Import guard passed.");
