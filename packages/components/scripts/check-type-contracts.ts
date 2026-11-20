import assert from "node:assert/strict";
import path from "node:path";
import ts from "typescript";

const directory = path.resolve(import.meta.dirname, "..");
const config = ts.readConfigFile(path.join(directory, "tsconfig.json"), ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
const files = ts.sys.readDirectory(
  directory,
  [".ts", ".tsx"],
  ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/code-cov/**"],
  ["src/**/*", "scripts/**/*", "vitest.setup.ts"],
);
assert(
  files.some((file) => file.endsWith("button.test.tsx")),
  "Type contracts must include component tests.",
);
assert(
  files.some((file) => file.endsWith("number-field.stories.tsx")),
  "Type contracts must include Storybook stories.",
);
const program = ts.createProgram(files, {
  ...parsed.options,
  rootDir: directory,
  declaration: false,
  declarationMap: false,
  declarationDir: undefined,
  emitDeclarationOnly: false,
  incremental: false,
  noEmit: true,
  strict: true,
  strictNullChecks: true,
  types: [...(parsed.options.types ?? []), "vite/client"],
});
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
const formatted = ts.formatDiagnostics(diagnostics, {
  getCanonicalFileName: (file) => file,
  getCurrentDirectory: () => directory,
  getNewLine: () => "\n",
});
assert.equal(diagnostics.length, 0, formatted);
