/**
 * @fileoverview Explicit live-report inputs; no credentials enter the configuration.
 * @module github/scripts/lib/live-tests/config
 */
import {fileURLToPath} from "node:url";
import {createEnvironmentHelper} from "../../helpers/environment/index.ts";
import {DEFAULT_ARTIFACTS_DIR} from "../../helpers/constants.ts";
import {LIVE_REPORT_LIMITS} from "../workflow-constants.ts";
import {readTargetStatuses, type E2ETestResults, type LiveTarget} from "./results.ts";

/** Evidence locations, parsed execution metadata, and bounded presentation policy. */
export interface LiveConfiguration {
  readonly targets: readonly LiveTarget[];
  readonly artifactsDir: string;
  readonly templatePath: string;
  readonly maxIssueBodyChars: number;
  readonly maxLogTailChars: number;
  readonly maxAssertionSummaryChars: number;
  readonly maxTargetSummaryChars: number;
  readonly maxJsonBytes: number;
  readonly maxLogBytes: number;
  readonly statuses: E2ETestResults;
  readonly healthJson?: string;
}

/** The existing three supported live workflow targets. */
export const DEFAULT_TARGETS: readonly LiveTarget[] = Object.freeze(["frontend", "backend", "cv"]);

/**
 * Parses immutable metadata and budgets once, without logging credentials.
 * @param variables - Explicit environment snapshot.
 * @returns Bounded configuration with default targets and existing override names.
 * @throws For supplied invalid targets or nonpositive/noninteger limits.
 */
export function readLiveConfiguration(variables: Readonly<Record<string, string | undefined>>): LiveConfiguration {
  const environment = createEnvironmentHelper(variables);
  const raw = environment.get("TARGETS");
  let targets: readonly LiveTarget[] = DEFAULT_TARGETS;
  if (raw !== undefined) {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length === 0) throw new TypeError("Invalid live targets");
    targets = [
      ...new Set(
        value.map((value): LiveTarget => {
          if (typeof value !== "string") throw new TypeError("Invalid live target");
          const target = value.trim().toLowerCase();
          if (target !== "frontend" && target !== "backend" && target !== "cv") throw new TypeError("Unsupported live target");
          return target;
        }),
      ),
    ];
  }
  const limit = (name: string, fallback: number): number => {
    const value = environment.getInt(name, fallback);
    if (value <= 0) throw new RangeError(`Live report limit '${name}' must be positive`);
    return value;
  };
  const healthJson = environment.get("HEALTH_JSON");
  return Object.freeze({
    targets: Object.freeze([...targets]),
    artifactsDir: environment.get("ARTIFACTS_DIR") ?? DEFAULT_ARTIFACTS_DIR,
    templatePath:
      environment.get("E2E_TEST_TEMPLATE_PATH") ?? fileURLToPath(new URL("../../../templates/e2e-test-template.md", import.meta.url)),
    maxIssueBodyChars: limit("E2E_MAX_ISSUE_BODY_CHARS", LIVE_REPORT_LIMITS.issueBodyChars),
    maxLogTailChars: limit("E2E_MAX_LOG_TAIL_CHARS", LIVE_REPORT_LIMITS.logTailChars),
    maxAssertionSummaryChars: limit("E2E_MAX_ASSERTION_SUMMARY_CHARS", LIVE_REPORT_LIMITS.assertionSummaryChars),
    maxTargetSummaryChars: limit("E2E_MAX_TARGET_SUMMARY_CHARS", LIVE_REPORT_LIMITS.targetSummaryChars),
    maxJsonBytes: limit("E2E_MAX_JSON_BYTES", LIVE_REPORT_LIMITS.jsonBytes),
    maxLogBytes: limit("E2E_MAX_LOG_BYTES", LIVE_REPORT_LIMITS.logBytes),
    statuses: readTargetStatuses(targets, variables),
    ...(healthJson === undefined ? {} : {healthJson}),
  });
}
