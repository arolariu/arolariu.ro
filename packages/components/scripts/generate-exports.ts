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
>;

interface ExportDirectoryConfig {
  sourceDir: string;
  distDir: string;
}

// Initialize exports object with main entry
const exports: Record<string, ExportEntry> = {
  "./package.json": "./package.json",
  "./styles": "./dist/index.css",
  "./styles.css": "./dist/index.css",
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
  const items = fs
    .readdirSync(config.sourceDir, {withFileTypes: true})
    .sort((a, b) => a.name.localeCompare(b.name));

  items.forEach((item) => {
    const itemName = item.name;

    // Skip test files
    if (itemName.includes(".test.") || itemName.includes(".spec.")) {
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

  packageJson.exports = exports;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));

  // eslint-disable-next-line no-console -- build script.
  console.log(`>>> ✅ Successfully generated ${Object.keys(exports).length - 1} component exports`);

  return exports;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
