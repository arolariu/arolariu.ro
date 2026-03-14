import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {afterEach, describe, expect, it} from "vitest";

import {collectExportsFromDirectory, createExportEntry} from "./generate-exports";

const temporaryDirectories: string[] = [];

describe("generate-exports helpers", () => {
  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directoryPath) => {
      fs.rmSync(directoryPath, {force: true, recursive: true});
    });
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
});
