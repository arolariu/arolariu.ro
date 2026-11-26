// @vitest-environment node

import {execFile} from "node:child_process";
import {copyFile, cp, mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

const run = promisify(execFile);
const runner = fileURLToPath(import.meta.resolve("@playwright/test/cli"));
const website = resolve(import.meta.dirname, "..");
const processTimeout = 20_000;

describe("website Playwright server selection", () => {
  let temporary: string;
  let primary: string;
  let linked: string;

  beforeAll(async () => {
    temporary = await mkdtemp(join(tmpdir(), "website Git registry "));
    primary = join(temporary, "primary");
    linked = join(temporary, "linked");
    await run("git", ["init", "--template=", "-b", "main", primary], {cwd: temporary});
    await run("git", ["-c", "core.hooksPath=" + join(temporary, "no-hooks"), "worktree", "add", "--orphan", "-b", "preview", linked], {
      cwd: primary,
    });

    const bridge = join(temporary, "node_modules", "@playwright", "test");
    await mkdir(bridge, {recursive: true});
    await Promise.all([
      writeFile(join(bridge, "package.json"), '{"exports":"./index.mjs"}'),
      writeFile(join(bridge, "index.mjs"), `export * from ${JSON.stringify(import.meta.resolve("@playwright/test"))};`),
    ]);

    for (const checkout of [primary, linked]) {
      const root = join(checkout, "sites", "arolariu.ro");
      const bin = join(root, "node_modules", "next", "dist", "bin");
      await mkdir(join(root, "scripts"), {recursive: true});
      await Promise.all([mkdir(join(root, "src")), mkdir(join(root, "certificates")), mkdir(bin, {recursive: true})]);
      await Promise.all([
        writeFile(join(root, "certificates", "localhost-key.pem"), "fixture"),
        writeFile(join(root, "certificates", "localhost.pem"), "fixture"),
        writeFile(join(bin, "next"), "fixture, not executed by --list"),
        writeFile(join(root, "package.json"), '{"type":"module"}'),
        copyFile(join(website, "playwright.config.ts"), join(root, "playwright.config.ts")),
        copyFile(join(website, "scripts", "worktreePreview.ts"), join(root, "scripts", "worktreePreview.ts")),
        cp(join(website, "tests", "config"), join(root, "tests", "config"), {recursive: true}),
        writeFile(join(root, "src", "preview.spec.ts"), 'import {test} from "@playwright/test"; test("config only", () => {});'),
        writeFile(
          join(root, "inspect.config.ts"),
          `import config from "./playwright.config";
const server = config.webServer;
if (process.env.E2E_WORKTREE_PORT) {
  const expected = "https://127.0.0.1:" + process.env.E2E_WORKTREE_PORT;
  for (const use of [config.use, ...config.projects.map((project) => project.use)]) {
    if (use.baseURL !== expected || use.ignoreHTTPSErrors !== false) throw new Error("Missing strict preview TLS");
  }
  if (server?.env.SITE_URL !== expected || server.reuseExistingServer !== false) throw new Error("Missing owned HTTPS preview");
} else if (process.env.PREVIEW_TEST_EXPECT_LEGACY === "true") {
  if (!server?.reuseExistingServer || server.url !== "https://localhost:3000") throw new Error("Missing legacy server");
} else if (server) {
  throw new Error("Remote test would start or reuse a local server");
}
export default {...config, globalSetup: undefined, globalTeardown: undefined, reporter: "line"};
`,
        ),
      ]);
    }
  }, processTimeout);

  afterAll(async () => {
    await rm(temporary, {recursive: true, force: true});
  });

  function list(checkout: string, overrides: Readonly<Record<string, string | undefined>> = {}, cwd = checkout): ReturnType<typeof run> {
    const env = {...process.env};
    for (const key of ["BASE_URL", "TEST_ENV", "CI", "E2E_USE_PROD", "E2E_WORKTREE_PORT"]) delete env[key];
    return run(process.execPath, [runner, "test", "--list", "--config", join(checkout, "sites", "arolariu.ro", "inspect.config.ts")], {
      cwd,
      env: {...env, ...overrides},
      timeout: processTimeout,
    });
  }

  it(
    "fails closed in a linked worktree without the opt-in",
    async () => {
      await expect(list(linked)).rejects.toMatchObject({code: 1, stderr: expect.stringContaining("E2E_WORKTREE_PORT")});
    },
    processTimeout,
  );

  it(
    "uses the config checkout even when invoked with primary-checkout Git environment",
    async () => {
      await expect(list(linked, {GIT_DIR: join(primary, ".git"), GIT_WORK_TREE: primary}, primary)).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining("Local Playwright in a linked Git worktree requires E2E_WORKTREE_PORT"),
      });
    },
    processTimeout,
  );

  it.each(["https://127.1:3000", "https://[::ffff:127.0.0.1]:3000", "https://app.localhost.:3000"])(
    "does not bypass isolation with the explicit loopback URL %s",
    async (url) => {
      await expect(list(linked, {BASE_URL: url})).rejects.toMatchObject({code: 1, stderr: expect.stringContaining("E2E_WORKTREE_PORT")});
    },
    processTimeout,
  );

  it(
    "preserves default server reuse in the primary checkout",
    async () => {
      await expect(list(primary, {PREVIEW_TEST_EXPECT_LEGACY: "true"})).resolves.toMatchObject({
        stdout: expect.stringContaining("config only"),
      });
    },
    processTimeout,
  );

  it(
    "uses the owned HTTPS origin without relaxing browser TLS for the opted-in worktree",
    async () => {
      await expect(list(linked, {E2E_WORKTREE_PORT: "3101"})).resolves.toMatchObject({stdout: expect.stringContaining("config only")});
    },
    processTimeout,
  );

  it.each([{TEST_ENV: "staging"}, {BASE_URL: "https://example.test"}])(
    "keeps explicit remote selection %j without selecting a local server",
    async (env) => {
      await expect(list(linked, env)).resolves.toMatchObject({stdout: expect.stringContaining("config only")});
    },
    processTimeout,
  );
});
