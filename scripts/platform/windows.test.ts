// @vitest-environment node
/**
 * @fileoverview Tests for Windows command resolution and `cmd.exe` argument escaping.
 * @module scripts/platform/windows.test
 *
 * @remarks
 * Pure tests: `planSpawn` receives a fixed environment snapshot and a scripted `isFile` predicate,
 * so no filesystem or process is touched. The live round trip through a real `.cmd` shim lives in
 * `Process.test.ts`.
 */

import {describe, expect, it} from "vitest";

import type {EnvironmentSnapshot} from "./Environment.ts";
import {escapeCmdArgument, escapeCmdCommand, planSpawn} from "./windows.ts";

const snapshot: EnvironmentSnapshot = {
  variables: {},
  cwd: "C:\\repo",
  executablePath: "C:\\node\\node.exe",
  platform: "win32",
  architecture: "x64",
  stdinIsTTY: false,
  stdoutIsTTY: false,
  isCI: false,
};

const windowsSnapshot = (variables: Readonly<Record<string, string | undefined>>): EnvironmentSnapshot => ({
  ...snapshot,
  platform: "win32",
  variables,
});

const only =
  (...paths: readonly string[]) =>
  (candidate: string): boolean =>
    paths.includes(candidate);

describe("escapeCmdArgument", () => {
  it("escapes cmd metacharacters so injected commands never run", () => {
    // Act
    const escaped = escapeCmdArgument("safe&echo PWNED", true);

    // Assert
    expect(escaped).toBe('^^^"safe^^^&echo^^^ PWNED^^^"');
  });

  it("doubles trailing backslashes before the closing quote", () => {
    // Act
    const escaped = escapeCmdArgument("trailing\\", false);

    // Assert
    expect(escaped).toBe('^"trailing\\\\^"');
  });

  it("doubles every backslash in a run that precedes a quote", () => {
    // Act
    const escaped = escapeCmdArgument('a\\\\"b', false);

    // Assert: a, four backslashes, an escaped quote, b, all inside an escaped outer quote pair.
    expect(escaped).toBe('^"a\\\\\\\\\\^"b^"');
  });

  it("doubles every backslash in a trailing run", () => {
    // Act
    const escaped = escapeCmdArgument("end\\\\", false);

    // Assert
    expect(escaped).toBe('^"end\\\\\\\\^"');
  });

  it("keeps backslashes that are not followed by a quote literal", () => {
    // Act
    const escaped = escapeCmdArgument("C:\\dir\\file", false);

    // Assert
    expect(escaped).toBe('^"C:\\dir\\file^"');
  });

  it("quotes an empty argument", () => {
    // Act
    const escaped = escapeCmdArgument("", false);

    // Assert
    expect(escaped).toBe('^"^"');
  });
});

describe("escapeCmdCommand", () => {
  it("escapes cmd metacharacters in the resolved command path", () => {
    // Act
    const escaped = escapeCmdCommand("C:\\Program Files (x86)\\n&m\\npm.cmd");

    // Assert
    expect(escaped).toBe("C:\\Program^ Files^ ^(x86^)\\n^&m\\npm.cmd");
  });
});

describe("planSpawn", () => {
  it("plans .cmd shims through the shell on win32", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "npm", args: ["run", "a b"]}, environment, (path) => path === "C:\\n\\npm.CMD");

    // Assert
    expect(plan.shell).toBe(true);
    expect(plan.command.endsWith("npm.CMD")).toBe(true);
    expect(plan.args).toEqual([escapeCmdArgument("run", true), escapeCmdArgument("a b", true)]);
  });

  it("spawns .exe directly on win32", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "git", args: ["status"]}, environment, only("C:\\n\\git.EXE"));

    // Assert
    expect(plan).toEqual({command: "C:\\n\\git.EXE", args: ["status"], shell: false});
  });

  it("leaves commands untouched off Windows", () => {
    // Arrange
    const environment: EnvironmentSnapshot = {...snapshot, platform: "linux", variables: {PATH: "/usr/bin"}};

    // Act
    const plan = planSpawn({command: "npm", args: ["ci"]}, environment, () => true);

    // Assert
    expect(plan).toEqual({command: "npm", args: ["ci"], shell: false});
  });

  it("leaves path-qualified commands untouched", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "C:\\tools\\x.exe", args: ["a"]}, environment, () => true);

    // Assert
    expect(plan).toEqual({command: "C:\\tools\\x.exe", args: ["a"], shell: false});
  });

  it("routes path-qualified cmd shims through the shell", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "C:\\tools\\x.cmd", args: ["a b"]}, environment, () => false);

    // Assert
    expect(plan).toEqual({command: "C:\\tools\\x.cmd", args: [escapeCmdArgument("a b", true)], shell: true});
  });

  it("routes path-qualified batch files through the shell case-insensitively", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n"});

    // Act
    const plan = planSpawn({command: "C:/my tools/x.BAT", args: []}, environment, () => false);

    // Assert
    expect(plan).toEqual({command: escapeCmdCommand("C:/my tools/x.BAT"), args: [], shell: true});
  });

  it("leaves path-qualified cmd shims untouched off Windows", () => {
    // Arrange
    const environment: EnvironmentSnapshot = {...snapshot, platform: "linux", variables: {}};

    // Act
    const plan = planSpawn({command: "/tools/x.cmd", args: ["a b"]}, environment, () => true);

    // Assert
    expect(plan).toEqual({command: "/tools/x.cmd", args: ["a b"], shell: false});
  });

  it("leaves forward-slash path-qualified commands untouched", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n"});

    // Act
    const plan = planSpawn({command: "./tools/x", args: []}, environment, () => true);

    // Assert
    expect(plan).toEqual({command: "./tools/x", args: [], shell: false});
  });

  it("leaves unresolved commands untouched", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "missing", args: ["x"]}, environment, () => false);

    // Assert
    expect(plan).toEqual({command: "missing", args: ["x"], shell: false});
  });

  it("looks up Path and PathExt case-insensitively", () => {
    // Arrange
    const environment = windowsSnapshot({Path: 'C:\\a;;"C:\\b"', PathExt: ".exe;.bat"});

    // Act
    const plan = planSpawn({command: "tool", args: []}, environment, only("C:\\b\\tool.bat"));

    // Assert
    expect(plan).toEqual({command: escapeCmdCommand("C:\\b\\tool.bat"), args: [], shell: true});
  });

  it("prefers the last case-insensitive match so overrides win", () => {
    // Arrange
    const environment = windowsSnapshot({Path: "C:\\old", PATH: "C:\\new"});

    // Act
    const plan = planSpawn({command: "tool", args: []}, environment, only("C:\\old\\tool.EXE", "C:\\new\\tool.COM"));

    // Assert
    expect(plan).toEqual({command: "C:\\new\\tool.COM", args: [], shell: false});
  });

  it("defaults PATHEXT to .COM;.EXE;.BAT;.CMD", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n"});
    const probed: string[] = [];

    // Act
    planSpawn({command: "x", args: []}, environment, (path) => {
      probed.push(path);
      return false;
    });

    // Assert
    expect(probed).toEqual(["C:\\n\\x.COM", "C:\\n\\x.EXE", "C:\\n\\x.BAT", "C:\\n\\x.CMD"]);
  });

  it("probes the bare name first when the command already has an extension", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD"});

    // Act
    const plan = planSpawn({command: "npx.cmd", args: ["vitest"]}, environment, only("C:\\n\\npx.cmd"));

    // Assert
    expect(plan).toEqual({command: escapeCmdCommand("C:\\n\\npx.cmd"), args: [escapeCmdArgument("vitest", true)], shell: true});
  });

  it("spawns a resolved file with a non-shim extension directly", () => {
    // Arrange
    const environment = windowsSnapshot({PATH: "C:\\n", PATHEXT: ".EXE;.CMD;.PS1"});

    // Act
    const plan = planSpawn({command: "script", args: ["a"]}, environment, only("C:\\n\\script.PS1"));

    // Assert
    expect(plan).toEqual({command: "script", args: ["a"], shell: false});
  });

  it("leaves the command untouched when PATH is missing", () => {
    // Arrange
    const environment = windowsSnapshot({});

    // Act
    const plan = planSpawn({command: "npm", args: []}, environment, () => true);

    // Assert
    expect(plan).toEqual({command: "npm", args: [], shell: false});
  });
});
