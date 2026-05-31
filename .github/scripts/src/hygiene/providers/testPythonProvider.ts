/**
 * @fileoverview Python unit tests provider (@arolariu/exp pytest suite).
 * @module github/scripts/src/hygiene/providers/testPythonProvider
 *
 * @remarks
 * Runs `python -m pytest --junitxml=...` in sites/exp.arolariu.ro and parses
 * the produced JUnit XML report into a TestSuitesPayload with one suite.
 */

import * as exec from "@actions/exec";
import fs from "node:fs/promises";
import * as path from "node:path";
import {touchesPython} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../domain/provider.ts";
import {
  aggregateSuites,
  flattenSuiteFindings,
  jUnitSuitesToResult,
  parseJUnitXml,
  testSuitesPayloadSchema,
  type SuiteResult,
  type TestSuitesPayload,
} from "./_testHelpers.ts";

const EXP_DIR = path.join("sites", "exp.arolariu.ro");
const JUNIT_REL = path.join(EXP_DIR, ".pytest-cache", "hygiene-junit.xml");

export const testPythonProvider: CheckProvider<TestSuitesPayload> = {
  id: "test-python",
  name: "Python Unit Tests",
  icon: "🐍",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: touchesPython,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const junitAbs = path.join(input.workspaceRoot, JUNIT_REL);
    await fs.rm(junitAbs, {force: true}).catch(() => {});
    await fs.mkdir(path.dirname(junitAbs), {recursive: true}).catch(() => {});

    await exec.getExecOutput(
      "python",
      ["-m", "pytest", "-q", `--junitxml=${path.relative(path.join(input.workspaceRoot, EXP_DIR), junitAbs)}`],
      {cwd: path.join(input.workspaceRoot, EXP_DIR), ignoreReturnCode: true, silent: true},
    );

    let xml: string;
    try {
      xml = await fs.readFile(junitAbs, "utf-8");
    } catch {
      const suite: SuiteResult = {
        name: "python",
        totalTests: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        findings: [
          {
            kind: "line",
            severity: "error",
            file: "<pytest>",
            line: 1,
            column: 1,
            message: "pytest produced no JUnit XML report (check setup-python / pip install steps in the workflow).",
            ruleId: "python/runner-failed",
            suite: "python",
          },
        ],
      };
      return {payload: aggregateSuites([suite]), findings: flattenSuiteFindings([suite])};
    }

    const junitSuites = parseJUnitXml(xml);
    if (junitSuites.length === 0) {
      const empty: SuiteResult = {
        name: "python",
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        findings: [],
      };
      return {payload: aggregateSuites([empty]), findings: []};
    }

    const suiteResults: SuiteResult[] =
      junitSuites.length === 1
        ? [jUnitSuitesToResult("python", junitSuites)]
        : junitSuites.map((s) => jUnitSuitesToResult(s.name || "python", [s]));

    return {
      payload: aggregateSuites(suiteResults),
      findings: flattenSuiteFindings(suiteResults),
    };
  },
};
