/**
 * @fileoverview Unit tests for lint.worker step composition.
 * @module scripts/workers/lint.worker.test
 *
 * @remarks
 * stepsForTarget is the pure-data piece of the worker — it returns a list of
 * {label, run} pairs without side effects until run() is called. These tests
 * lock the per-target shape and exercise CV dispatch through real process
 * execution with isolated CLI fixtures.
 */

import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {delimiter, join} from "node:path";
import {ESLint} from "eslint";
import {describe, expect, it, vi} from "vitest";
import eslintConfig from "../../eslint.config.ts";
import {stepsForTarget} from "./lint.worker.ts";
import type {LintWorkerInput} from "../types/lint.ts";

// Lock the expected step labels per target. If this changes, the worker MUST
// be updated in lockstep.
const EXPECTED_STEPS: Record<string, readonly string[]> = {
  packages: ["eslint"],
  website: ["eslint"],
  cv: ["svelte-check", "eslint"],
  status: ["svelte-check", "eslint"],
  api: ["dotnet format", "dotnet build"],
  exp: ["ruff check"],
};

/**
 * Builds a minimal LintWorkerInput stub for the given target.
 */
function makeInput(target: string): LintWorkerInput {
  return {
    target: target as LintWorkerInput["target"],
    configName: `[@arolariu/${target}]`,
    taskIndex: 0,
    dispatchedAt: Date.now(),
  };
}

async function withCvCheckTools(exitCode: number, run: () => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "cv-lint-owner-"));
  const windows = process.platform === "win32";
  const npm = windows
    ? `@echo off
if "%~1"=="run" if "%~2"=="check" (
echo CV-owned check
echo %CD%
exit /b ${exitCode}
)
exit /b 99
`
    : `#!/bin/sh
if [ "$1" = run ] && [ "$2" = check ]; then
  echo "CV-owned check"
  pwd
  exit ${exitCode}
fi
exit 99
`;
  const npx = windows
    ? `@echo off
if "%~1"=="svelte-kit" if "%~2"=="sync" exit /b 0
echo TS2307: Cannot find module '@azure/functions' 1>&2
exit /b 2
`
    : `#!/bin/sh
if [ "$1" = svelte-kit ] && [ "$2" = sync ]; then exit 0; fi
echo "TS2307: Cannot find module '@azure/functions'" >&2
exit 2
`;
  try {
    await writeFile(join(directory, windows ? "npm.cmd" : "npm"), npm, {mode: 0o755});
    await writeFile(join(directory, windows ? "npx.cmd" : "npx"), npx, {mode: 0o755});
    vi.stubEnv("PATH", `${directory}${delimiter}${process.env["PATH"] ?? ""}`);
    await run();
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, {recursive: true, force: true});
  }
}

describe("stepsForTarget contract", () => {
  for (const [target, labels] of Object.entries(EXPECTED_STEPS)) {
    it(`${target} → [${labels.join(", ")}]`, () => {
      const steps = stepsForTarget(makeInput(target));
      expect(steps.map((s) => s.label)).toEqual(labels);
    });
  }

  it.each([0, 7])("uses the API-aware CV check and propagates exit code %i", async (exitCode) => {
    await withCvCheckTools(exitCode, async () => {
      const result = await stepsForTarget(makeInput("cv"))[0]?.run();

      expect(result?.code).toBe(exitCode);
      expect(result?.output).toContain("CV-owned check");
      expect(result?.output.replaceAll("\\", "/")).toContain("sites/cv.arolariu.ro");
    });
  });

  it("every target has at least 1 step and at most 2 steps", () => {
    for (const target of Object.keys(EXPECTED_STEPS)) {
      const steps = stepsForTarget(makeInput(target));
      expect(steps.length).toBeGreaterThanOrEqual(1);
      expect(steps.length).toBeLessThanOrEqual(2);
    }
  });
});
describe("ESLint generated-output boundary", () => {
  it("globally ignores generated JavaScript without excluding application or tooling source", async () => {
    const eslint = new ESLint({overrideConfigFile: true, overrideConfig: eslintConfig});

    expect(await eslint.isPathIgnored("sites/arolariu.ro/.next/server/app/page.js")).toBe(true);
    expect(await eslint.isPathIgnored("packages/components/dist/index.js")).toBe(true);
    expect(await eslint.isPathIgnored("packages/components/storybook-static/sb-manager/globals-runtime.js")).toBe(true);
    expect(await eslint.isPathIgnored("packages/components/code-cov/vitest/prettify.js")).toBe(true);
    expect(await eslint.isPathIgnored(".github/scripts/coverage/prettify.js")).toBe(true);
    expect(await eslint.isPathIgnored("sites/status.arolariu.ro/test-results/report.js")).toBe(true);
    expect(await eslint.isPathIgnored("sites/arolariu.ro/src/app/page.tsx")).toBe(false);
    expect(await eslint.isPathIgnored("scripts/cli.ts")).toBe(false);
  });
});
