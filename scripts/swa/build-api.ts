import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {appendFile, cp, glob, readFile, rm, stat} from "node:fs/promises";
import {join, resolve} from "node:path";
import {build} from "esbuild";
import {MonorepositoryConsoleLogger} from "../common/logger.ts";

type Site = "cv" | "status";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Builds an optional managed API and materializes its locked production dependencies.
 * @param site - One of the two independently deployed SvelteKit sites.
 * @param repositoryRoot - Repository root; defaults to this script's owning checkout.
 * @returns The repository-relative API artifact path, or empty when no API exists.
 */
export async function buildSiteApi(site: Site, repositoryRoot = resolve(import.meta.dirname, "..", "..")): Promise<{apiLocation: string}> {
  if (site !== "cv" && site !== "status") throw new Error("Unsupported SWA site.");
  const project = join(repositoryRoot, "sites", `${site}.arolariu.ro`);
  const api = join(project, "api");
  const output = join(project, "build", "server");
  await rm(output, {recursive: true, force: true});
  try {
    await stat(api);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {apiLocation: ""};
    throw error;
  }
  const manifest: unknown = JSON.parse(await readFile(join(api, "package.json"), "utf8"));
  if (
    !isRecord(manifest)
    || manifest["private"] !== true
    || manifest["type"] !== "module"
    || manifest["main"] !== "functions/*.mjs"
    || !isRecord(manifest["dependencies"])
    || typeof manifest["dependencies"]["@azure/functions"] !== "string"
  ) {
    throw new Error("API requires a private ESM Functions runtime manifest with main functions/*.mjs and a declared Functions SDK.");
  }
  await readFile(join(api, "package-lock.json"), "utf8");
  const host: unknown = JSON.parse(await readFile(join(api, "host.json"), "utf8"));
  if (!isRecord(host) || host["version"] !== "2.0") throw new Error("Invalid managed API host configuration.");
  const entries: string[] = [];
  for await (const entry of glob("src/functions/*.ts", {cwd: api, exclude: ["**/*.test.ts", "**/*.d.ts"]})) {
    entries.push(join(api, entry));
  }
  if (entries.length === 0) throw new Error("API has no Function entry points.");
  const npm = process.env["npm_execpath"];
  if (!npm) throw new Error("Run API packaging through npm run build:api.");
  try {
    execFileSync(process.execPath, [npm, "ci", "--workspaces=false", "--omit=dev", "--ignore-scripts"], {cwd: api, stdio: "pipe"});
  } catch {
    throw new Error("API production dependency restore failed. Run npm ci in the site's api directory for diagnostics.");
  }
  await build({
    entryPoints: entries,
    outdir: join(output, "functions"),
    outExtension: {".js": ".mjs"},
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    external: ["@azure/functions"],
    alias: {"@": join(project, "src")},
    logLevel: "silent",
  });
  for (const name of ["host.json", "package.json", "package-lock.json", "node_modules"]) {
    await cp(join(api, name), join(output, name), {recursive: true});
  }
  const runtimeRequire = createRequire(join(output, "package.json"));
  const sdk = runtimeRequire.resolve("@azure/functions");
  if (!sdk.startsWith(join(output, "node_modules"))) throw new Error("API artifact is missing its Functions SDK dependency closure.");
  return {apiLocation: `sites/${site}.arolariu.ro/build/server`};
}

if (import.meta.main) {
  const site = process.argv[2];
  if (site !== "cv" && site !== "status") throw new Error("Specify cv or status.");
  const {apiLocation} = await buildSiteApi(site);
  if (process.env["GITHUB_OUTPUT"]) await appendFile(process.env["GITHUB_OUTPUT"], `api_location=${apiLocation}\n`);
  new MonorepositoryConsoleLogger("swa").success(apiLocation ? `Packaged ${site} managed API.` : `${site} has no managed API.`);
}
