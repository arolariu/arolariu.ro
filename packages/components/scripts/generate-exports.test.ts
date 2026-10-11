import fs from "node:fs";
import {execFileSync} from "node:child_process";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

import {afterEach, describe, expect, it} from "vitest";

import {collectExportsFromDirectory, createExportEntry} from "./generate-exports";

const temporaryDirectories: string[] = [];

describe("generate-exports helpers", () => {
  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directoryPath) => {
      fs.rmSync(directoryPath, {force: true, recursive: true});
    });
  });

  it.each([
    ["node10", ts.ModuleResolutionKind.Node10],
    ["bundler", ts.ModuleResolutionKind.Bundler],
    ["nodenext", ts.ModuleResolutionKind.NodeNext],
  ])("resolves both generated stylesheet declarations with %s module resolution", (_mode, moduleResolution) => {
    const consumerDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ac-styles-exports-"));
    temporaryDirectories.push(consumerDirectory);
    const packageDirectory = path.join(consumerDirectory, "package");
    fs.mkdirSync(packageDirectory, {recursive: true});
    fs.mkdirSync(path.join(packageDirectory, "scripts"));
    fs.mkdirSync(path.join(packageDirectory, "dist"));
    fs.copyFileSync(path.resolve(import.meta.dirname, "../package.json"), path.join(packageDirectory, "package.json"));
    fs.writeFileSync(path.join(packageDirectory, "dist", "index.css"), ":root { --ac-test: 1; }");
    const scriptPath = path.join(packageDirectory, "scripts", "generate-exports.ts");
    fs.copyFileSync(path.resolve(import.meta.dirname, "generate-exports.ts"), scriptPath);

    execFileSync(process.execPath, [scriptPath], {stdio: "pipe"});

    const installedDirectory = path.join(consumerDirectory, "node_modules", "@arolariu", "components");
    fs.mkdirSync(path.dirname(installedDirectory), {recursive: true});
    fs.renameSync(packageDirectory, installedDirectory);
    const manifest = JSON.parse(fs.readFileSync(path.join(installedDirectory, "package.json"), "utf8"));
    for (const subpath of ["./styles", "./styles.css"]) {
      expect(manifest.exports[subpath]).toEqual({types: "./dist/styles.d.ts", default: "./dist/index.css"});
      const resolved = ts.resolveModuleName(
        `@arolariu/components/${subpath.slice(2)}`,
        path.join(consumerDirectory, "consumer.ts"),
        {moduleResolution},
        ts.sys,
      );
      expect(resolved.resolvedModule?.resolvedFileName).toBe(path.join(installedDirectory, "dist", "styles.d.ts").replaceAll("\\", "/"));
    }
    expect(manifest.typesVersions["*"]["*"]).toEqual(["./dist/*"]);
    expect(manifest.typesVersions["*"]["."]).toEqual(["./dist/index.d.ts"]);
    expect(fs.readFileSync(path.join(installedDirectory, "dist", "styles.d.ts"), "utf8")).toContain("export {};");
  });

  it("creates export entries for hooks and utilities in their dedicated dist directories", () => {
    // Arrange
    const hooksDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ac-hooks-"));
    const utilitiesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ac-lib-"));
    temporaryDirectories.push(hooksDirectory, utilitiesDirectory);

    fs.writeFileSync(path.join(hooksDirectory, "useIsMobile.tsx"), "export const useIsMobile = () => false;");
    fs.writeFileSync(path.join(utilitiesDirectory, "utilities.ts"), "export const cn = () => '';");

    // Act
    const hookExports = collectExportsFromDirectory({distDir: "hooks", sourceDir: hooksDirectory});
    const utilityExports = collectExportsFromDirectory({distDir: "lib", sourceDir: utilitiesDirectory});

    // Assert
    expect(hookExports["./useIsMobile"]).toEqual(createExportEntry("hooks", "useIsMobile"));
    expect(utilityExports["./utilities"]).toEqual(createExportEntry("lib", "utilities"));
  });

  it("preserves component exports under the ui dist directory", () => {
    // Arrange
    const componentsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ac-components-"));
    temporaryDirectories.push(componentsDirectory);
    fs.writeFileSync(path.join(componentsDirectory, "button.tsx"), "export const Button = () => null;");

    // Act
    const componentExports = collectExportsFromDirectory({
      distDir: "components/ui",
      sourceDir: componentsDirectory,
    });

    // Assert
    expect(componentExports["./button"]).toEqual(createExportEntry("components/ui", "button"));
  });

  it("collects exports in deterministic alphabetical order", () => {
    // Arrange
    const componentsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ac-components-order-"));
    temporaryDirectories.push(componentsDirectory);
    fs.writeFileSync(path.join(componentsDirectory, "zebra.tsx"), "export const Zebra = () => null;");
    fs.writeFileSync(path.join(componentsDirectory, "alpha.tsx"), "export const Alpha = () => null;");
    fs.writeFileSync(path.join(componentsDirectory, "middle.tsx"), "export const Middle = () => null;");

    // Act
    const componentExports = collectExportsFromDirectory({
      distDir: "components/ui",
      sourceDir: componentsDirectory,
    });

    // Assert
    expect(Object.keys(componentExports)).toEqual(["./alpha", "./middle", "./zebra"]);
  });
});
