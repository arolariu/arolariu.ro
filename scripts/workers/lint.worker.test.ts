/**
 * @fileoverview Unit tests for lint.worker step composition.
 * @module scripts/workers/lint.worker.test
 *
 * @remarks
 * stepsForTarget is the pure-data piece of the worker — it returns a list of
 * {label, run} pairs without side effects until run() is called. These tests
 * lock the per-target shape so a regression in the dispatch table is caught.
 */

import {ESLint} from "eslint";
import {describe, expect, it} from "vitest";
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

describe("stepsForTarget contract", () => {
  for (const [target, labels] of Object.entries(EXPECTED_STEPS)) {
    it(`${target} → [${labels.join(", ")}]`, () => {
      const steps = stepsForTarget(makeInput(target));
      expect(steps.map((s) => s.label)).toEqual(labels);
    });
  }

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
    expect(await eslint.isPathIgnored("sites/arolariu.ro/src/app/page.tsx")).toBe(false);
    expect(await eslint.isPathIgnored("scripts/cli.ts")).toBe(false);
  });
});
