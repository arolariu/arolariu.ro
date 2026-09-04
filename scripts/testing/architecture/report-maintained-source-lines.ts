/**
 * @fileoverview Machine-readable maintained-line budget reporter for `scripts/**`.
 * @module scripts/testing/architecture/report-maintained-source-lines
 *
 * @remarks
 * This entrypoint is one of the narrow, named exceptions to the repository direct-output policy:
 * it emits raw JSON on `process.stdout` for CI and local consumption instead of routing through
 * `ComposedTerminalPresenter`, and it is excluded from production script source discovery.
 * `scripts/testing/architecture/output-policy.test.ts` asserts this exemption stays limited to
 * `scripts/testing/architecture/report-*.ts`. Run it with `npm run analyze:scripts:loc`.
 */

import {
  approvedScriptsArchitectureBaseline,
  cohortOneActiveMaintainedLineCount,
  cohortOneHighWaterMaintainedLineCount,
} from "./scripts-architecture-baseline.ts";
import {calculateMaintainedSourceHistoryReport, calculateMaintainedSourceLineReport} from "./maintained-source-lines.ts";

const report = calculateMaintainedSourceLineReport(process.cwd());
const history = calculateMaintainedSourceHistoryReport(process.cwd());
const document = {
  baseline: approvedScriptsArchitectureBaseline.maintainedLineCount,
  currentMaximum: cohortOneActiveMaintainedLineCount,
  highWaterMaximum: cohortOneHighWaterMaintainedLineCount,
  finalMaximum: approvedScriptsArchitectureBaseline.finalMaximumMaintainedLineCount,
  history,
  ...report,
};

process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
if (report.totalMaintainedLineCount > cohortOneActiveMaintainedLineCount) {
  process.exitCode = 1;
}
