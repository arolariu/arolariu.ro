// @vitest-environment node

import {execFile} from "node:child_process";
import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {createServer, type Server} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

const run = promisify(execFile);
const runner = fileURLToPath(import.meta.resolve("@playwright/test/cli"));
const playwright = import.meta.resolve("@playwright/test");
const previewModule = new URL("./worktreePreview.ts", import.meta.url).href;
const host = "127.0.0.1";
const processTimeout = 20_000;

async function listen(port = 0): Promise<{server: Server; port: number}> {
  const server = createServer((_request, response) => response.end("competing listener"));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing test listener address");
  return {server, port: address.port};
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

describe("worktree preview process ownership", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "worktree preview "));
    const certificates = join(root, "certificates");
    await mkdir(certificates);
    await Promise.all([
      writeFile(join(certificates, "localhost-key.pem"), "fixture"),
      writeFile(join(certificates, "localhost.pem"), "fixture"),
      // Exercise the real Playwright lifecycle and preview options with a small listener in place of Next.
      writeFile(
        join(root, "listener.cjs"),
        `const {createServer} = require("node:http");
const server = createServer((_request, response) => response.end(process.env.SITE_URL));
server.listen(Number(process.argv[2]), "${host}", () => console.log("✓ Ready in 10ms"));
`,
      ),
      writeFile(
        join(root, "playwright.config.mjs"),
        `import {createWorktreeWebServer, parseWorktreePreview} from ${JSON.stringify(previewModule)};
const preview = parseWorktreePreview({port: process.env.PREVIEW_TEST_PORT, ci: false, productionBuild: false});
const server = createWorktreeWebServer(preview, ${JSON.stringify(root)});
export default {
  reporter: "line",
  testMatch: "listener.spec.mjs",
  workers: 1,
  webServer: {...server, command: "node listener.cjs " + preview.port, timeout: 5000},
};
`,
      ),
      writeFile(
        join(root, "listener.spec.mjs"),
        `import {test, expect} from ${JSON.stringify(playwright)};
test("reaches the owned child", async () => {
  const address = "${host}:" + process.env.PREVIEW_TEST_PORT;
  const response = await fetch("http://" + address);
  expect(await response.text()).toBe("https://" + address);
});
`,
      ),
    ]);
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  function runPlaywright(port: number): ReturnType<typeof run> {
    return run(process.execPath, [runner, "test", "--config", join(root, "playwright.config.mjs")], {
      cwd: tmpdir(),
      env: {...process.env, PREVIEW_TEST_PORT: String(port), SITE_URL: "https://localhost:3000"},
      timeout: processTimeout,
    });
  }

  it(
    "uses the owned child and releases its port when Playwright exits",
    async () => {
      const {server, port} = await listen();
      await close(server);

      const {stdout} = await runPlaywright(port);

      expect(stdout).toContain("1 passed");
      await close((await listen(port)).server);
    },
    processTimeout,
  );

  it(
    "fails before running specs when the port already has an owner",
    async () => {
      const {server, port} = await listen();
      try {
        await expect(runPlaywright(port)).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining("EADDRINUSE"),
          stdout: expect.not.stringContaining("Running 1 test"),
        });

        const response = await fetch(`http://${host}:${port}`);
        expect(await response.text()).toBe("competing listener");
      } finally {
        await close(server);
      }
    },
    processTimeout,
  );
});
