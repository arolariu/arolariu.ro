/**
 * @fileoverview Compatible test-provider exports; helpers own raw DTOs, lib owns policy.
 * @module github/scripts/src/hygiene/providers/_testHelpers
 */
export {parseJUnitXml, type JUnitCase, type JUnitSuite} from "../../../helpers/reports/junit.ts";
export {parseTrxDuration, parseTrxResults, type TrxResult} from "../../../helpers/reports/trx.ts";
export {decodeVitestReport, type VitestAssertion, type VitestTestFile, type VitestJsonReport} from "../../../helpers/reports/vitest.ts";
export {
  aggregateSuites,
  flattenSuiteFindings,
  jUnitSuitesToResult,
  parseTrxToSuiteResult,
  extractLastVitestReport,
  vitestReportToSuiteResult,
  testSuitesPayloadSchema,
  type SuiteResult,
  type TestSuitesPayload,
} from "../../../lib/testing/suites.ts";
