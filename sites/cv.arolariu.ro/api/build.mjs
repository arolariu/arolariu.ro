import {build} from "esbuild";
import {cp, rm} from "node:fs/promises";
import {resolve} from "node:path";

const output = resolve(import.meta.dirname, "../build/server");
await rm(output, {recursive: true, force: true});
await build({
  absWorkingDir: import.meta.dirname,
  entryPoints: ["src/functions/cv-json.ts"],
  outdir: resolve(output, "functions"),
  outExtension: {".js": ".mjs"},
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["@azure/functions"],
  alias: {"@": resolve(import.meta.dirname, "../src")},
});
for (const name of ["host.json", "package.json", "package-lock.json", "node_modules"]) {
  await cp(resolve(import.meta.dirname, name), resolve(output, name), {recursive: true});
}
