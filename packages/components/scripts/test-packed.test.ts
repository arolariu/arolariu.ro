import {spawnSync} from "node:child_process";
import {EventEmitter} from "node:events";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {afterEach, describe, expect, it} from "vitest";
import {parseCLI} from "vitest/node";

import {isEntryModule, PackedGateInterruptedError, packedVitestArgs, parsePackedFilename, runPackedGate} from "./test-packed";

const gateScript = path.resolve(import.meta.dirname, "test-packed.ts");
const scratchDirectories: string[] = [];

/** Creates a scratch directory outside the repository; every one is removed after its test. */
function createScratchDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "packed-gate-test-"));
  scratchDirectories.push(directory);
  return directory;
}

/** Copies the gate into `<root>/real` and links `<root>/link` to that copy (a junction on Windows, a symlink elsewhere). */
function createLinkedGateCopy(root: string): {readonly real: string; readonly linked: string} {
  const real = path.join(root, "real");
  fs.mkdirSync(real);
  fs.copyFileSync(gateScript, path.join(real, "test-packed.ts"));
  fs.writeFileSync(path.join(real, "package.json"), '{"type":"module"}');
  fs.symlinkSync(real, path.join(root, "link"), "junction");
  return {real: path.join(real, "test-packed.ts"), linked: path.join(root, "link", "test-packed.ts")};
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    const link = path.join(directory, "link");
    // Remove the link itself first so the recursive removal below never traverses it.
    if (fs.lstatSync(link, {throwIfNoEntry: false})) fs.unlinkSync(link);
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

describe("required packed verification", () => {
  it("routes the default package test through real-archive verification while retaining the unit target", () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
    expect(manifest.scripts.test).toBe("npm run test:packed");
    expect(manifest.scripts["test:packed"]).toBe("node scripts/test-packed.ts");
    expect(manifest.scripts["test:unit"]).toBe("vitest run");
  });

  describe("release archive handoff", () => {
    it.each(["pass", "fail", "interrupt", "unset", "existing"] as const)(
      "retains only the tested archive for the %s release case",
      (mode) => {
        const root = createScratchDirectory();
        const scripts = path.join(root, "scripts");
        const modules = path.join(root, "node_modules");
        const output = path.join(root, "release");
        const filename = "component-pack-fixture-1.0.0.tgz";
        const archive = path.join(output, filename);
        const tested = path.join(root, "tested.tgz");
        const npm = process.env["npm_execpath"];
        if (!npm) throw new Error("Run the release archive test through npm");

        fs.mkdirSync(scripts);
        fs.mkdirSync(modules);
        fs.copyFileSync(gateScript, path.join(scripts, "test-packed.ts"));
        const vitest = createRequire(import.meta.url).resolve("vitest/package.json");
        fs.symlinkSync(path.dirname(vitest), path.join(modules, "vitest"), "junction");
        fs.writeFileSync(
          path.join(root, "package.json"),
          JSON.stringify({
            name: "component-pack-fixture",
            version: "1.0.0",
            type: "module",
            files: ["dist"],
            scripts: {build: "node build.mjs"},
          }),
        );
        fs.writeFileSync(
          path.join(root, "build.mjs"),
          'import fs from "node:fs"; fs.mkdirSync("dist"); fs.writeFileSync("dist/index.js", "export const fixture = true;");',
        );
        fs.writeFileSync(
          path.join(root, "fixture.test.mjs"),
          `
            import {copyFileSync, readFileSync} from "node:fs";
            import {dirname, join} from "node:path";
            import {expect, it} from "vitest";

            it("exercises the extracted archive", () => {
              const packed = process.env.AROLARIU_COMPONENTS_PACKED_ROOT;
              copyFileSync(join(dirname(packed), ${JSON.stringify(filename)}), process.env.TESTED_ARCHIVE);
              expect(readFileSync(join(packed, "dist/index.js"), "utf8")).toContain("fixture = true");
              if (process.env.PACK_CASE === "fail") throw new Error("fixture verification failure");
              if (process.env.PACK_CASE === "interrupt") process.kill(Number(process.env.PACK_GATE_PID), "SIGTERM");
            });
          `,
        );
        fs.writeFileSync(
          path.join(root, "run-gate.mjs"),
          'import {verifyPackedArtifact} from "./scripts/test-packed.ts"; process.env.PACK_GATE_PID = String(process.pid); await verifyPackedArtifact();',
        );
        if (mode === "existing") {
          fs.mkdirSync(output);
          fs.writeFileSync(archive, "do not replace");
        }

        const result = spawnSync(process.execPath, ["run-gate.mjs"], {
          cwd: root,
          encoding: "utf8",
          timeout: 15_000,
          env: {
            ...process.env,
            npm_execpath: npm,
            npm_config_offline: "true",
            PACK_CASE: mode,
            TESTED_ARCHIVE: tested,
            AROLARIU_COMPONENTS_PACK_OUTPUT: mode === "unset" ? undefined : output,
          },
        });

        expect(result.error).toBeUndefined();
        expect(fs.existsSync(tested), result.stderr).toBe(true);
        if (mode === "pass" || mode === "unset") expect(result.status, result.stderr).toBe(0);
        else expect(result.status).not.toBe(0);
        if (mode === "pass") expect(fs.readFileSync(archive)).toEqual(fs.readFileSync(tested));
        else if (mode === "existing") expect(fs.readFileSync(archive, "utf8")).toBe("do not replace");
        else expect(fs.existsSync(archive)).toBe(false);
      },
      20_000,
    );
  });

  it("accepts the single local npm archive filename", () => {
    expect(parsePackedFilename('[{"filename":"arolariu-components-3.0.0.tgz"}]')).toBe("arolariu-components-3.0.0.tgz");
  });

  it.each([
    [[], 2],
    [["--maxWorkers=4"], 4],
    [["--max-workers", "4"], 4],
  ] as const)("forwards Vitest arguments with exactly one worker limit for %j", (args, workers) => {
    const {filter, options} = parseCLI(["vitest", ...packedVitestArgs([...args, "src/index.test.ts"])]);

    expect(options.maxWorkers).toBe(workers);
    expect(filter).toEqual(["src/index.test.ts"]);
  });

  it.each([
    "[]",
    "{}",
    "null",
    "[null]",
    '[{"filename":"one.tgz"},{"filename":"two.tgz"}]',
    '[{"filename":42}]',
    '[{"filename":""}]',
    '[{"filename":"../outside.tgz"}]',
    '[{"filename":"..\\\\outside.tgz"}]',
    '[{"filename":"archive.zip"}]',
  ])("rejects invalid archive metadata %s", (output) => {
    expect(() => parsePackedFilename(output)).toThrow(/npm pack/u);
  });
});

describe("interrupted packed verification", () => {
  it("git-ignores an extraction that a forced kill leaves behind while package sources stay visible", () => {
    const repository = path.resolve(import.meta.dirname, "../../..");
    const checkIgnore = (relativePath: string) =>
      spawnSync("git", ["check-ignore", "--no-index", "--verbose", relativePath], {cwd: repository, encoding: "utf8"});

    const leftover = checkIgnore("packages/components/.packed-contract-Ab12Cd/package/package.json");
    expect(leftover.status, leftover.stderr).toBe(0);
    expect(leftover.stdout).toMatch(/^\.gitignore:\d+:packages\/components\/\.packed-contract-\*\/\t/u);
    expect(checkIgnore("packages/components/scripts/test-packed.ts").status).toBe(1);
  });

  it.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)("forwards %s to the running child, removes the extraction and reports exit code %i", async (signal, exitCode) => {
    const signals = new EventEmitter();
    const parent = createScratchDirectory();
    let extraction = "";
    let childFailure: unknown;

    const outcome = await runPackedGate(async ({run, temporaryDirectory}) => {
      extraction = temporaryDirectory(parent);
      fs.mkdirSync(path.join(extraction, "package"));
      fs.writeFileSync(path.join(extraction, "package", "package.json"), "{}");
      const child = run(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], {stdio: "ignore"}).catch((error: unknown) => {
        childFailure = error;
        throw error;
      });
      signals.emit(signal);
      await child;
    }, signals).catch((error: unknown) => error);

    expect(outcome).toBeInstanceOf(PackedGateInterruptedError);
    expect(outcome).toMatchObject({signal, exitCode});
    expect(String(childFailure)).toContain(signal);
    expect(path.basename(extraction)).toMatch(/^\.packed-contract-/u);
    expect(fs.existsSync(extraction)).toBe(false);
    expect(fs.readdirSync(parent)).toEqual([]);
    expect(signals.listenerCount("SIGINT") + signals.listenerCount("SIGTERM")).toBe(0);
  });

  it("starts no further step after a termination signal arrives between steps", async () => {
    const signals = new EventEmitter();
    const marker = path.join(createScratchDirectory(), "second-step-started");

    const outcome = await runPackedGate(async ({run}) => {
      await run(process.execPath, ["-e", ""], {stdio: "ignore"});
      signals.emit("SIGTERM");
      await run(process.execPath, ["-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "")`], {stdio: "ignore"});
    }, signals).catch((error: unknown) => error);

    expect(outcome).toMatchObject({signal: "SIGTERM", exitCode: 143});
    expect(fs.existsSync(marker)).toBe(false);
  });

  it("removes extractions and listeners after a passing run and after a failing step", async () => {
    const signals = new EventEmitter();
    const parent = createScratchDirectory();

    await expect(
      runPackedGate(async ({run, temporaryDirectory}) => {
        temporaryDirectory(parent);
        return run(process.execPath, ["-e", "process.stdout.write('packed')"], {stdio: ["ignore", "pipe", "inherit"]});
      }, signals),
    ).resolves.toBe("packed");
    const failure = await runPackedGate(async ({run, temporaryDirectory}) => {
      temporaryDirectory(parent);
      await run(process.execPath, ["-e", "process.exit(3)"], {stdio: "ignore"});
    }, signals).catch((error: unknown) => error);

    expect(failure).not.toBeInstanceOf(PackedGateInterruptedError);
    expect(String(failure)).toContain("exit code 3");
    expect(fs.readdirSync(parent)).toEqual([]);
    expect(signals.listenerCount("SIGINT") + signals.listenerCount("SIGTERM")).toBe(0);
  });

  it("listens for termination signals on process by default", async () => {
    const before = {SIGINT: process.listenerCount("SIGINT"), SIGTERM: process.listenerCount("SIGTERM")};

    await runPackedGate(async () => {
      expect(process.listenerCount("SIGINT")).toBe(before.SIGINT + 1);
      expect(process.listenerCount("SIGTERM")).toBe(before.SIGTERM + 1);
    });

    expect(process.listenerCount("SIGINT")).toBe(before.SIGINT);
    expect(process.listenerCount("SIGTERM")).toBe(before.SIGTERM);
  });
});

describe("packed verification entry detection", () => {
  it.each(["real", "linked"] as const)("runs the gate when started through the %s script path", (variant) => {
    const paths = createLinkedGateCopy(createScratchDirectory());
    // Without npm's environment the gate stops at its first guard, before building or extracting anything.
    const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toLowerCase().startsWith("npm_")));

    const result = spawnSync(process.execPath, [paths[variant]], {encoding: "utf8", env: environment});

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain("Run packed verification through npm run test:packed");
  });

  it("compares real paths and ignores entries that name no file or another module", () => {
    const {real, linked} = createLinkedGateCopy(createScratchDirectory());
    const moduleUrl = pathToFileURL(real).href;

    expect(isEntryModule(real, moduleUrl)).toBe(true);
    expect(isEntryModule(linked, moduleUrl)).toBe(true);
    expect(isEntryModule(undefined, moduleUrl)).toBe(false);
    expect(isEntryModule("-", moduleUrl)).toBe(false);
    expect(isEntryModule(path.resolve(import.meta.dirname, "test-packed.test.ts"), moduleUrl)).toBe(false);
  });

  it("fails loudly when an entry named like the gate resolves to a different file", () => {
    const root = createScratchDirectory();
    const {real} = createLinkedGateCopy(root);
    const impostor = path.join(root, "other", "test-packed.ts");
    fs.mkdirSync(path.dirname(impostor));
    fs.writeFileSync(impostor, "");

    expect(() => isEntryModule(impostor, pathToFileURL(real).href)).toThrow(/does not resolve to/u);
  });
});
