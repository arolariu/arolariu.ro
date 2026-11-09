import fs from "node:fs";
import {execFileSync, spawnSync} from "node:child_process";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import ts from "typescript";

import {afterEach, describe, expect, it} from "vitest";

import {collectExportsFromDirectory, createExportEntry, isEntryModule} from "./generate-exports";

const temporaryDirectories: string[] = [];

function createFixtureDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(import.meta.dirname, `.${prefix}-`));
  temporaryDirectories.push(directory);
  return directory;
}

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
    const consumerDirectory = createFixtureDirectory("styles-exports");
    fs.writeFileSync(path.join(consumerDirectory, "package.json"), JSON.stringify({name: "components-export-consumer", type: "module"}));
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
    const hooksDirectory = createFixtureDirectory("hooks");
    const utilitiesDirectory = createFixtureDirectory("lib");

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
    const componentsDirectory = createFixtureDirectory("components");
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
    const componentsDirectory = createFixtureDirectory("components-order");
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

  it("advertises every supported real public component subpath, never private underscore modules", () => {
    const sourceDirectory = path.resolve(import.meta.dirname, "../src/components/ui");
    const componentExports = collectExportsFromDirectory({sourceDir: sourceDirectory, distDir: "components/ui"});
    const publicNames = fs
      .readdirSync(sourceDirectory)
      .filter((name) => name.endsWith(".tsx") && !name.startsWith("_") && !/\.(test|spec|stories)\./u.test(name))
      .map((name) => name.slice(0, -4))
      .sort((left, right) => left.localeCompare(right));
    expect(Object.keys(componentExports).sort((left, right) => left.localeCompare(right))).toEqual(publicNames.map((name) => `./${name}`));
    for (const name of ["attachment", "bubble", "marker", "message", "native-select", "direction"]) {
      expect(componentExports[`./${name}`]).toEqual({
        types: `./dist/components/ui/${name}.d.ts`,
        import: `./dist/components/ui/${name}.js`,
        default: `./dist/components/ui/${name}.js`,
      });
    }
    expect(componentExports).not.toHaveProperty("./_visual-effects");
    expect(componentExports).not.toHaveProperty("./sonner");
    for (const name of ["legacy-toast", "legacy-command-dialog", "legacy-alert-dialog-action"]) {
      expect(componentExports).not.toHaveProperty(`./${name}`);
    }
  });

  it("prepares the manifest's short component, hook and utility entrypoints before the deferred build", () => {
    const packageDirectory = path.resolve(import.meta.dirname, "..");
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
    const missing: string[] = [];
    for (const directory of ["components/ui", "hooks", "lib"]) {
      for (const fileName of fs.readdirSync(path.join(packageDirectory, "src", directory))) {
        if (!/\.tsx?$/u.test(fileName) || fileName.startsWith("_") || /\.(test|spec|stories)\./u.test(fileName)) continue;
        const name = path.basename(fileName, path.extname(fileName));
        if (name === "index") continue;
        if (!manifest.exports[`./${name}`]) {
          missing.push(name);
          continue;
        }
        expect(manifest.exports[`./${name}`]).toEqual({
          types: `./dist/${directory}/${name}.d.ts`,
          import: `./dist/${directory}/${name}.js`,
          default: `./dist/${directory}/${name}.js`,
        });
      }
    }
    expect(missing).toEqual([]);
    for (const privatePath of ["./_*", "./components/ui/_*", "./hooks/_*", "./lib/_*"]) {
      expect(manifest.exports[privatePath]).toBeNull();
    }
    expect(manifest.exports["./styles"]).toEqual({types: "./dist/styles.d.ts", default: "./dist/index.css"});
    expect(manifest.exports["./styles.css"]).toEqual({types: "./dist/styles.d.ts", default: "./dist/index.css"});
  });

  it("does not publish private files, private indexed directories or their descendants", () => {
    const directory = createFixtureDirectory("private-components");
    const actualSource = path.resolve(import.meta.dirname, "../src/components/ui/button.tsx");
    fs.copyFileSync(actualSource, path.join(directory, "button.tsx"));
    fs.copyFileSync(actualSource, path.join(directory, "_private.tsx"));
    fs.mkdirSync(path.join(directory, "_internal"));
    fs.copyFileSync(actualSource, path.join(directory, "_internal", "index.tsx"));
    fs.mkdirSync(path.join(directory, "_nested"));
    fs.copyFileSync(actualSource, path.join(directory, "_nested", "button.tsx"));
    expect(collectExportsFromDirectory({sourceDir: directory, distDir: "components/ui"})).toEqual({
      "./button": {
        types: "./dist/components/ui/button.d.ts",
        import: "./dist/components/ui/button.js",
        default: "./dist/components/ui/button.js",
      },
    });
  });

  it("blocks private nested paths even through the retained dist wildcard", () => {
    const consumerDirectory = createFixtureDirectory("private-resolution");
    fs.writeFileSync(path.join(consumerDirectory, "package.json"), JSON.stringify({name: "components-private-consumer", type: "module"}));
    const packageDirectory = path.join(consumerDirectory, "package");
    fs.mkdirSync(path.join(packageDirectory, "scripts"), {recursive: true});
    fs.copyFileSync(path.resolve(import.meta.dirname, "../package.json"), path.join(packageDirectory, "package.json"));
    const scriptPath = path.join(packageDirectory, "scripts", "generate-exports.ts");
    fs.copyFileSync(path.resolve(import.meta.dirname, "generate-exports.ts"), scriptPath);
    execFileSync(process.execPath, [scriptPath], {stdio: "pipe"});
    fs.mkdirSync(path.join(packageDirectory, "dist", "components", "ui"), {recursive: true});
    fs.copyFileSync(
      path.resolve(import.meta.dirname, "../src/components/ui/_visual-effects.tsx"),
      path.join(packageDirectory, "dist", "components", "ui", "_visual-effects.d.ts"),
    );
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
    expect(manifest.exports["./*"].import).toBe("./dist/*.js");
    expect(manifest.exports["./_*"]).toBeNull();
    expect(manifest.exports["./components/ui/_*"]).toBeNull();
    expect(manifest.exports["./hooks/_*"]).toBeNull();
    expect(manifest.exports["./lib/_*"]).toBeNull();
    const installedDirectory = path.join(consumerDirectory, "node_modules", "@arolariu", "components");
    fs.mkdirSync(path.dirname(installedDirectory), {recursive: true});
    fs.renameSync(packageDirectory, installedDirectory);
    const resolved = ts.resolveModuleName(
      "@arolariu/components/components/ui/_visual-effects",
      path.join(consumerDirectory, "consumer.ts"),
      {moduleResolution: ts.ModuleResolutionKind.Bundler},
      ts.sys,
    );
    expect(resolved.resolvedModule).toBeUndefined();
  });
});

const packageDirectory = path.resolve(import.meta.dirname, "..");
const linkedFixtureRoots: string[] = [];

/** Recreates file and folder names with empty files: the generator reads directory entries only. */
function mirrorEntryNames(source: string, target: string): void {
  fs.mkdirSync(target, {recursive: true});
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    if (entry.isDirectory()) mirrorEntryNames(path.join(source, entry.name), path.join(target, entry.name));
    else fs.writeFileSync(path.join(target, entry.name), "");
  }
}

/**
 * Copies the generator into `<root>/real/package/scripts` and links `<root>/link` to `<root>/real` (a junction on Windows, a
 * symlink elsewhere). With `withSources`, the copy also gets the real source entry names and the committed manifest with its
 * `exports` value cleared in place, so only a generator run can restore the committed bytes.
 */
function createLinkedGeneratorCopy(withSources: boolean) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "generate-exports-entry-"));
  linkedFixtureRoots.push(root);
  const packageCopy = path.join(root, "real", "package");
  fs.mkdirSync(path.join(packageCopy, "scripts"), {recursive: true});
  fs.copyFileSync(path.resolve(import.meta.dirname, "generate-exports.ts"), path.join(packageCopy, "scripts", "generate-exports.ts"));
  if (withSources) {
    for (const directory of ["components/ui", "hooks", "lib"]) {
      mirrorEntryNames(path.join(packageDirectory, "src", directory), path.join(packageCopy, "src", directory));
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
    manifest.exports = {};
    fs.writeFileSync(path.join(packageCopy, "package.json"), JSON.stringify(manifest, null, 2));
  }
  fs.symlinkSync(path.join(root, "real"), path.join(root, "link"), "junction");
  return {
    root,
    packageCopy,
    real: path.join(packageCopy, "scripts", "generate-exports.ts"),
    linked: path.join(root, "link", "package", "scripts", "generate-exports.ts"),
  } as const;
}

describe("generate-exports entry detection", () => {
  afterEach(() => {
    for (const root of linkedFixtureRoots.splice(0)) {
      const link = path.join(root, "link");
      // Remove the link itself first so the recursive removal below never traverses it.
      if (fs.lstatSync(link, {throwIfNoEntry: false})) fs.unlinkSync(link);
      fs.rmSync(root, {force: true, recursive: true});
    }
  });

  it.each(["real", "linked"] as const)(
    "regenerates the committed manifest byte for byte when started through the %s script path",
    (variant) => {
      const fixture = createLinkedGeneratorCopy(true);

      const result = spawnSync(process.execPath, [fixture[variant]], {encoding: "utf8"});

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("Successfully generated");
      expect(fs.readFileSync(path.join(fixture.packageCopy, "package.json"), "utf8")).toBe(
        fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
      );
      expect(fs.readFileSync(path.join(fixture.packageCopy, "dist", "styles.d.ts"), "utf8")).toBe("export {};\r\n");
    },
  );

  it("compares real paths and ignores entries that name no file or another module", () => {
    const fixture = createLinkedGeneratorCopy(false);
    const moduleUrl = pathToFileURL(fixture.real).href;

    expect(isEntryModule(fixture.real, moduleUrl)).toBe(true);
    expect(isEntryModule(fixture.linked, moduleUrl)).toBe(true);
    expect(isEntryModule(undefined, moduleUrl)).toBe(false);
    expect(isEntryModule("-", moduleUrl)).toBe(false);
    expect(isEntryModule(path.resolve(import.meta.dirname, "generate-exports.test.ts"), moduleUrl)).toBe(false);
  });

  it("fails loudly when an entry named like the generator resolves to a different file", () => {
    const fixture = createLinkedGeneratorCopy(false);
    const impostor = path.join(fixture.root, "generate-exports.ts");
    fs.writeFileSync(impostor, "");

    expect(() => isEntryModule(impostor, pathToFileURL(fixture.real).href)).toThrow(/does not resolve to/u);
  });
});
