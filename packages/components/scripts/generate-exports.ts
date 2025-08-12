/**
 * This script will generate the `exports` property on the package.json file
 * based on every built component, so that they are properly exported.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  } catch (err) {
    return false;
  }
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));

type ExportEntry = Readonly<
  | {
      types?: string;
      import?: string;
      require?: string;
      default?: string;
    }
  | string
>;

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

// Helper to process items in a directory
function processItems(dir: string, prefix: string = "") {
  if (!pathExists(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach((item) => {
    const itemName = item.name;

    // Skip files with extensions (we only want directories or direct component files)
    if (
      item.isFile() &&
      path.extname(itemName) !== ".tsx" &&
      path.extname(itemName) !== ".ts"
    ) {
      return;
    }

    let exportPath: string | null = null;
    let importPath: string | null = null;
    let typesPath: string | null = null;

    if (item.isDirectory()) {
      // Check for index.ts or index.tsx in directory
      const indexTsPath = path.join(dir, itemName, "index.ts");
      const indexTsxPath = path.join(dir, itemName, "index.tsx");

      if (pathExists(indexTsPath) || pathExists(indexTsxPath)) {
        const flatName = prefix + itemName.toLowerCase();

        exportPath = `./${flatName}`;
        importPath = `./dist/components/ui/${flatName}.js`;
        typesPath = `./dist/components/ui/${flatName}.d.ts`;
      } else {
        // Recursively process subdirectories
        processItems(
          path.join(dir, itemName),
          `${prefix}${itemName.toLowerCase()}-`,
        );
      }
    } else if (
      item.isFile() &&
      (path.extname(itemName) === ".tsx" || path.extname(itemName) === ".ts")
    ) {
      // Handle direct .tsx/.ts component files with flat structure
      const baseName = path.basename(itemName, path.extname(itemName));
      const flatName = prefix + baseName.toLowerCase();

      exportPath = `./${flatName}`;
      importPath = `./dist/components/ui/${flatName}.js`;
      typesPath = `./dist/components/ui/${flatName}.d.ts`;
    }

    // If we found a valid component, add it to exports
    if (exportPath && importPath && typesPath) {
      exports[exportPath] = {
        types: typesPath,
        import: importPath,
        default: importPath,
      };
      console.log(`>>> Added export for: ${exportPath}`);
    }
  });
}

// Process components
processItems(COMPONENTS_DIR);
processItems(HOOKS_DIR);
processItems(LIB_DIR);

// Update package.json
packageJson.exports = exports;
fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));

console.log(
  `>>> ✅ Successfully generated ${
    Object.keys(exports).length - 1
  } component exports`,
);
