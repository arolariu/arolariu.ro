import path from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

describe("required component TypeScript contracts", () => {
  it("checks production code, negative Vitest assertions, and the complete story graph", () => {
    const directory = path.resolve(import.meta.dirname, "..");
    const config = ts.readConfigFile(path.join(directory, "tsconfig.json"), ts.sys.readFile);
    expect(config.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
    const files = ts.sys.readDirectory(
      directory,
      [".ts", ".tsx"],
      ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/code-cov/**"],
      ["src/**/*", "scripts/**/*", "vitest.setup.ts"],
    );
    expect(files.some((file) => file.endsWith("button.test.tsx"))).toBe(true);
    expect(files.some((file) => file.endsWith("number-field.stories.tsx"))).toBe(true);
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
    expect(diagnostics.length, formatted).toBe(0);
  }, 120000);
});
