/**
 * Validates the single local archive reported by npm pack.
 *
 * @param output - The JSON stdout of npm pack.
 * @returns The archive's safe, package-local filename.
 */
export function parsePackedFilename(output: string): string {
  const result: unknown = JSON.parse(output);
  if (!Array.isArray(result) || result.length !== 1) throw new Error("npm pack must report exactly one archive");
  const entry: unknown = result[0];
  if (
    typeof entry !== "object"
    || entry === null
    || !("filename" in entry)
    || typeof entry.filename !== "string"
    || entry.filename !== path.basename(entry.filename)
    || entry.filename.includes("\\")
    || !entry.filename.endsWith(".tgz")
  ) {
    throw new Error("npm pack returned an invalid archive filename");
  }
  return entry.filename;
}

/**
 * Builds and tests the real npm archive with the existing Vitest runner and peers.
 *
 * @remarks
 * The isolated extraction lives beneath the package so real installed peers
 * resolve naturally. No source aliases, dependency installation, or publish
 * operation is involved.
 */
export function verifyPackedArtifact(): void {
  const directory = path.resolve(import.meta.dirname, "..");
  const npm = process.env["npm_execpath"];
  if (!npm) throw new Error("Run packed verification through npm run test:packed");
  execFileSync(process.execPath, [npm, "run", "build"], {cwd: directory, stdio: "inherit"});
  const temporary = fs.mkdtempSync(path.join(directory, ".packed-contract-"));
  try {
    const output = execFileSync(process.execPath, [npm, "pack", "--ignore-scripts", "--json", "--pack-destination", temporary], {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
    const archive = path.join(temporary, parsePackedFilename(output));
    const hash = createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
    console.log(`Verifying real npm archive ${path.basename(archive)} (sha256 ${hash})`);
    execFileSync("tar", ["-xzf", archive, "-C", temporary], {cwd: directory, stdio: "inherit"});
    const packedRoot = fs.realpathSync(path.join(temporary, "package"));
    if (!fs.existsSync(path.join(packedRoot, "dist", "index.js")) || packedRoot === fs.realpathSync(directory)) {
      throw new Error("The real npm archive was not extracted into an isolated package");
    }
    const require = createRequire(import.meta.url);
    const vitest = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");
    execFileSync(process.execPath, [vitest, "run", "--maxWorkers=2", ...process.argv.slice(2)], {
      cwd: directory,
      stdio: "inherit",
      env: {...process.env, AROLARIU_COMPONENTS_PACKED_ROOT: packedRoot},
    });
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyPackedArtifact();
}
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
