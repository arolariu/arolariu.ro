/**
 * @fileoverview Generates the `exports` map for `@arolariu/components`.
 * @module packages/components/scripts/generate-exports
 *
 * @remarks
 * Scans built component entrypoints and updates `package.json#exports` so
 * consumers can import subpaths (e.g. `@arolariu/components/button`).
 *
 * This is a build-time utility script; it should not be imported by runtime code.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

// ES Module alternative to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_JSON_PATH = path.resolve(__dirname, "../package.json");
const COMPONENTS_DIR = path.resolve(__dirname, "../src/components/ui");
const HOOKS_DIR = path.resolve(__dirname, "../src/hooks");
const LIB_DIR = path.resolve(__dirname, "../src/lib");
const DIST_DIR = path.resolve(__dirname, "../dist");

// Helper function to check if path exists
function pathExists(path: string): boolean {
  try {
    return fs.existsSync(path);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console -- build script.
    console.error(`Error checking path: ${path}`, error);
    return false;
  }
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));

type ExportEntry = Readonly<
  | {
      types?: string;
      import?: string;
      require?: string;
      default?: string;
    }
  | string
  | null
>;

interface ExportDirectoryConfig {
  sourceDir: string;
  distDir: string;
}

// Initialize exports object with main entry
const exports: Record<string, ExportEntry> = {
  "./package.json": "./package.json",
  "./styles": {types: "./dist/styles.d.ts", default: "./dist/index.css"},
  "./styles.css": {types: "./dist/styles.d.ts", default: "./dist/index.css"},
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./*": {
    types: "./dist/*.d.ts",
    import: "./dist/*.js",
    default: "./dist/*.js",
  },
  "./_*": null,
  "./components/ui/_*": null,
  "./hooks/_*": null,
  "./lib/_*": null,
};

/**
 * Creates a package export entry for a generated module.
 *
 * @param distDir The relative dist directory that contains the compiled file.
 * @param exportName The public subpath export name.
 * @returns A package exports map entry.
 */
export function createExportEntry(distDir: string, exportName: string): ExportEntry {
  const normalizedDistDir = distDir.replaceAll("\\", "/");

  return {
    types: `./dist/${normalizedDistDir}/${exportName}.d.ts`,
    import: `./dist/${normalizedDistDir}/${exportName}.js`,
    default: `./dist/${normalizedDistDir}/${exportName}.js`,
  };
}

/**
 * Collects subpath exports from a source directory and maps them to a dist directory.
 *
 * @param config Source and dist directory configuration.
 * @param prefix Optional export name prefix used for nested directories.
 * @returns A record of package subpath exports.
 */
export function collectExportsFromDirectory(config: Readonly<ExportDirectoryConfig>, prefix: string = ""): Record<string, ExportEntry> {
  if (!pathExists(config.sourceDir)) {
    return {};
  }

  const collectedExports: Record<string, ExportEntry> = {};
  const items = fs.readdirSync(config.sourceDir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name));

  items.forEach((item) => {
    const itemName = item.name;

    // Private modules may be emitted transitively, but are never package entrypoints.
    if (itemName.startsWith("_") || itemName.includes(".test.") || itemName.includes(".spec.") || itemName.includes(".stories.")) {
      return;
    }

    // Skip files with extensions (we only want directories or direct component files)
    if (item.isFile() && path.extname(itemName) !== ".tsx" && path.extname(itemName) !== ".ts") {
      return;
    }

    let exportName: string | null = null;

    if (item.isDirectory()) {
      // Check for index.ts or index.tsx in directory
      const indexTsPath = path.join(config.sourceDir, itemName, "index.ts");
      const indexTsxPath = path.join(config.sourceDir, itemName, "index.tsx");

      if (pathExists(indexTsPath) || pathExists(indexTsxPath)) {
        exportName = `${prefix}${itemName}`;
      } else {
        // Recursively process subdirectories
        Object.assign(
          collectedExports,
          collectExportsFromDirectory(
            {
              sourceDir: path.join(config.sourceDir, itemName),
              distDir: config.distDir,
            },
            `${prefix}${itemName}-`,
          ),
        );
      }
    } else if (item.isFile() && (path.extname(itemName) === ".tsx" || path.extname(itemName) === ".ts")) {
      // Handle direct .tsx/.ts component files with flat structure
      const baseName = path.basename(itemName, path.extname(itemName));

      if (baseName === "index") {
        return;
      }

      exportName = `${prefix}${baseName}`;
    }

    // If we found a valid component, add it to exports
    if (exportName) {
      const exportPath = `./${exportName}`;
      collectedExports[exportPath] = createExportEntry(config.distDir, exportName);

      // eslint-disable-next-line no-console -- build script.
      console.log(`>>> Added export for: ${exportPath}`);
    }
  });

  return collectedExports;
}

/**
 * Generates and persists the component package exports map.
 *
 * @returns The complete generated exports map.
 */
export function main(): Record<string, ExportEntry> {
  const exportDirectoryConfigs: readonly ExportDirectoryConfig[] = [
    {sourceDir: COMPONENTS_DIR, distDir: "components/ui"},
    {sourceDir: HOOKS_DIR, distDir: "hooks"},
    {sourceDir: LIB_DIR, distDir: "lib"},
  ];

  exportDirectoryConfigs.forEach((config) => {
    Object.assign(exports, collectExportsFromDirectory(config));
  });

  fs.mkdirSync(DIST_DIR, {recursive: true});
  fs.writeFileSync(path.join(DIST_DIR, "styles.d.ts"), "export {};\r\n");
  packageJson.exports = exports;
  packageJson.typesVersions = {
    ...packageJson.typesVersions,
    "*": {
      ...packageJson.typesVersions?.["*"],
      styles: ["./dist/styles.d.ts"],
      "styles.css": ["./dist/styles.d.ts"],
    },
  };
  // Serialize with CRLF + trailing newline so the generated file matches the
  // repository convention (.editorconfig `end_of_line = crlf` /
  // `insert_final_newline = true`, and Prettier's `endOfLine: "crlf"`).
  // Without this, `npm run build:components` and `npm run format` would
  // repeatedly rewrite this file against each other.
  const serializedPackageJson = `${JSON.stringify(packageJson, null, 2).replaceAll("\n", "\r\n")}\r\n`;
  fs.writeFileSync(PACKAGE_JSON_PATH, serializedPackageJson);

  // eslint-disable-next-line no-console -- build script.
  console.log(`>>> ✅ Successfully generated ${Object.keys(exports).length - 1} component exports`);

  return exports;
}

/**
 * Decides whether this module is the process entry point.
 *
 * @remarks
 * Node expands `process.argv[1]` to an absolute path but keeps symlinks and junctions, while `import.meta.url` names the
 * real file unless `--preserve-symlinks-main` is set. Both sides are compared as real paths, so a linked checkout
 * regenerates the exports instead of exiting `0` without writing anything. For the same reason, an entry that names this
 * script but resolves to another file throws. The script stays self-contained because its tests run a standalone copy.
 *
 * @param entry - The entry argument, `process.argv[1]`; absent for `--eval`.
 * @param moduleUrl - The module's `import.meta.url`.
 * @returns `true` when both resolve to the same real file.
 */
export function isEntryModule(entry: string | undefined, moduleUrl: string): boolean {
  if (!entry) return false;
  const modulePath = fs.realpathSync(fileURLToPath(moduleUrl));
  let entryPath: string | undefined;
  try {
    entryPath = fs.realpathSync(path.resolve(entry));
  } catch {
    // An entry that names no file, such as `-` for standard input, is not this module.
  }
  if (entryPath === modulePath) return true;
  if (path.basename(entry) === path.basename(modulePath)) {
    throw new Error(`${entry} names the export generator but does not resolve to ${modulePath}`);
  }
  return false;
}

if (isEntryModule(process.argv[1], import.meta.url)) {
  main();
}
