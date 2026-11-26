// @vitest-environment node

import {execFile} from "node:child_process";
import {access, copyFile, mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {createServer, type Server} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

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
    const scripts = join(root, "scripts");
    const next = join(root, "node_modules", "next");
    const cli = join(next, "dist", "bin");
    const worker = join(next, "dist", "server", "lib");
    await Promise.all([mkdir(certificates), mkdir(scripts), mkdir(cli, {recursive: true}), mkdir(worker, {recursive: true})]);
    await Promise.all([
      writeFile(join(certificates, "localhost-key.pem"), "fixture"),
      writeFile(join(certificates, "localhost.pem"), "fixture"),
      copyFile(join(import.meta.dirname, "worktreePreviewReady.ts"), join(scripts, "worktreePreviewReady.ts")),
      writeFile(join(next, "package.json"), '{"type":"commonjs"}'),
      writeFile(
        join(cli, "next"),
        `const {fork} = require("node:child_process");
const {resolve} = require("node:path");
const {deepEqual} = require("node:assert/strict");
const port = process.env.PREVIEW_TEST_PORT;
deepEqual(process.argv.slice(2), [
  "dev", "--hostname", "${host}", "--port", port, "--experimental-https",
  "--experimental-https-key", "certificates/localhost-key.pem",
  "--experimental-https-cert", "certificates/localhost.pem",
]);
const child = fork(resolve(__dirname, "../server/lib/start-server.js"), [port], {execArgv: []});
child.on("exit", () => { process.exit(0); });
`,
      ),
      // Reproduce Next's ordering: bind banner, handlers initialize, worker IPC.
      writeFile(
        join(worker, "start-server.js"),
        `const {createServer} = require("node:http");
const {existsSync, writeFileSync} = require("node:fs");
const mode = process.env.PREVIEW_TEST_MODE;
const port = process.argv[2];
let initialized = false;
const server = createServer((_request, response) => {
  response.statusCode = initialized ? 200 : 503;
  response.end(initialized ? process.env.SITE_URL : "initializing");
});
server.listen(Number(port), "${host}", () => {
  console.log("✓ Ready in 10ms");
  if (mode === "exit") {
    setTimeout(() => process.exit(23), 1000);
    return;
  }
  if (mode === "follow-on") {
    server.close(() => {
      writeFileSync("released", "");
      setInterval(() => { if (existsSync("replacement")) process.exit(23); }, 40);
    });
    return;
  }
  if (mode === "wrong-port") {
    process.send({nextServerReady: true, port: String(Number(port) + 1)});
    return;
  }
  setTimeout(() => {
    initialized = true;
    process.send({nextServerReady: true, port});
  }, mode === "delayed" ? 3500 : 0);
});
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
  webServer: {...server, timeout: process.env.PREVIEW_TEST_MODE === "wrong-port" ? 3000 : 7000},
};
`,
      ),
      writeFile(
        join(root, "listener.spec.mjs"),
        `import {test, expect} from ${JSON.stringify(playwright)};
test("reaches the owned child", async () => {
  const address = "${host}:" + process.env.PREVIEW_TEST_PORT;
  const response = await fetch("http://" + address);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("https://" + address);
});
`,
      ),
    ]);
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  function runPlaywright(port: number, mode = "normal"): ReturnType<typeof run> {
    return run(process.execPath, [runner, "test", "--config", join(root, "playwright.config.mjs")], {
      cwd: tmpdir(),
      env: {...process.env, PREVIEW_TEST_PORT: String(port), PREVIEW_TEST_MODE: mode, SITE_URL: "https://localhost:3000"},
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
    "does not start specs until the owned listener has initialized its application",
    async () => {
      const {server, port} = await listen();
      await close(server);

      const {stdout} = await runPlaywright(port, "delayed");

      expect(stdout).toContain("1 passed");
    },
    processTimeout,
  );

  it(
    "fails before starting specs if the bound child exits during initialization",
    async () => {
      const {server, port} = await listen();
      await close(server);

      await expect(runPlaywright(port, "exit")).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining("worker exited before application readiness (23)"),
        stdout: expect.not.stringContaining("Running 1 test"),
      });
      await close((await listen(port)).server);
    },
    processTimeout,
  );

  it(
    "ignores a successful response from a follow-on listener",
    async () => {
      const {server, port} = await listen();
      await close(server);

      const result = runPlaywright(port, "follow-on").catch((error: unknown) => error);
      await vi.waitFor(() => access(join(root, "released")), {timeout: 6000});
      const replacement = await listen(port);
      try {
        const response = await fetch(`http://${host}:${port}`);
        expect(await response.text()).toBe("competing listener");
        await writeFile(join(root, "replacement"), "");

        expect(await result).toMatchObject({
          code: 1,
          stderr: expect.stringContaining("worker exited before application readiness (23)"),
          stdout: expect.not.stringContaining("Running 1 test"),
        });
      } finally {
        await close(replacement.server);
      }
    },
    processTimeout,
  );

  it(
    "times out before running specs if the owned worker reports readiness for the wrong port",
    async () => {
      const {server, port} = await listen();
      await close(server);

      await expect(runPlaywright(port, "wrong-port")).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("Timed out waiting 3000ms"),
      });
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
