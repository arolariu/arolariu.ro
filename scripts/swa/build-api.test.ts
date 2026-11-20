import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {buildSiteApi} from "./build-api.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

async function fixture(site: "cv" | "status", withApi = false): Promise<{root: string; project: string}> {
  const root = await mkdtemp(join(tmpdir(), "swa-api-"));
  roots.push(root);
  const project = join(root, "sites", `${site}.arolariu.ro`);
  await mkdir(join(project, "build", "server"), {recursive: true});
  await writeFile(join(project, "build", "server", "stale.js"), "old adapter output");
  if (withApi) {
    const api = join(project, "api");
    await mkdir(join(api, "src", "functions"), {recursive: true});
    for (const name of ["package.json", "package-lock.json", "host.json"]) {
      await cp(resolve("sites", "cv.arolariu.ro", "api", name), join(api, name));
    }
    await writeFile(
      join(api, "src", "functions", "sample.ts"),
      'import {HttpRequest} from "@azure/functions"; export const method = () => new HttpRequest({url:"https://example.test",method:"GET"}).method;',
    );
    await writeFile(join(api, "src", "functions", "sample.test.ts"), "this should not be bundled");
    await writeFile(join(api, "local.settings.json"), '{"Values":{"private":"must-not-ship"}}');
  }
  return {root, project};
}

describe("SWA API packaging", () => {
  it("removes stale status API output without adding an endpoint", async () => {
    const {root, project} = await fixture("status");
    expect(await buildSiteApi("status", root)).toEqual({apiLocation: ""});
    await expect(readFile(join(project, "build", "server", "stale.js"))).rejects.toMatchObject({code: "ENOENT"});
  });

  it("rejects a partial API directory rather than reporting no API", async () => {
    const {root, project} = await fixture("status");
    await mkdir(join(project, "api"));
    await expect(buildSiteApi("status", root)).rejects.toThrow();
  });

  it.each(["cv", "status"] as const)(
    "packages %s with an isolated, complete runtime and only Function entries",
    async (site) => {
      const {root, project} = await fixture(site, true);
      expect(await buildSiteApi(site, root)).toEqual({apiLocation: `sites/${site}.arolariu.ro/build/server`});
      const output = join(project, "build", "server");
      const manifest = JSON.parse(await readFile(join(output, "package.json"), "utf8")) as {main: string};
      expect(manifest.main).toBe("functions/*.mjs");
      expect(await readFile(join(output, "functions", "sample.mjs"), "utf8")).toContain("@azure/functions");
      const require = createRequire(join(output, "package.json"));
      expect(require.resolve("@azure/functions")).toContain(join(output, "node_modules"));
      await expect(readFile(join(output, "functions", "sample.test.mjs"))).rejects.toMatchObject({code: "ENOENT"});
      await expect(readFile(join(output, "local.settings.json"))).rejects.toMatchObject({code: "ENOENT"});
      await expect(readFile(join(output, "stale.js"))).rejects.toMatchObject({code: "ENOENT"});
    },
    30_000,
  );

  it("fails when a source cannot be bundled", async () => {
    const {root, project} = await fixture("cv", true);
    await writeFile(join(project, "api", "src", "functions", "sample.ts"), 'import "./missing.ts";');
    await expect(buildSiteApi("cv", root)).rejects.toThrow();
  }, 30_000);

  it("rejects an API without a declared Functions SDK", async () => {
    const {root, project} = await fixture("cv", true);
    await writeFile(join(project, "api", "package.json"), '{"private":true,"type":"module","main":"functions/*.mjs"}');
    await expect(buildSiteApi("cv", root)).rejects.toThrow(/Functions/u);
  });
});
