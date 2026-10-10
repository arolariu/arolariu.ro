// @vitest-environment node
import {execFile} from "node:child_process";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {promisify} from "node:util";

import {expect, it} from "vitest";

const execute = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..", "..");

it("waits for component declarations before website builds and development", async () => {
  const directory = await mkdtemp(join(tmpdir(), "arolariu-nx-prerequisites-"));
  const output = join(directory, "graph.json");
  try {
    await execute(
      process.execPath,
      [
        join(repositoryRoot, "node_modules", "nx", "dist", "bin", "nx.js"),
        "run-many",
        "--targets=build,dev",
        "--projects=@arolariu/website",
        `--graph=${output}`,
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NX_DAEMON: "false",
          NX_TUI: "false",
          NX_LOAD_DOT_ENV_FILES: "false",
          NX_WORKSPACE_ROOT_PATH: repositoryRoot,
          NX_WORKSPACE_DATA_DIRECTORY: join(directory, "workspace-data"),
          NX_CACHE_DIRECTORY: join(directory, "cache"),
          NX_PLUGIN_NO_TIMEOUTS: "true",
        },
        timeout: 90_000,
        windowsHide: true,
      },
    );
    const graph: unknown = JSON.parse(await readFile(output, "utf8"));

    for (const target of ["build", "dev"]) {
      expect(graph).toHaveProperty(
        ["tasks", "dependencies", `@arolariu/website:${target}`],
        expect.arrayContaining(["@arolariu/components:build"]),
      );
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}, 120_000);
