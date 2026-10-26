/**
 * @fileoverview Required immutable-plan CLI transport shared by provider and gate.
 * @module github/scripts/lib/planning/transport
 */
import {resolve} from "node:path";
import {fs} from "../../helpers/filesystem/index.ts";
import {getWorkingDirectory} from "../../helpers/environment/index.ts";
import {MAX_REPORT_BYTES} from "../../helpers/reports/validation.ts";
import {decodeHygienePlan} from "./plan.ts";
import type {HygienePlan} from "./types.ts";

/**
 * Requires exactly the explicit plan argument; there is no missing-plan fallback.
 * @param argv - Arguments after an optional provider identity.
 * @returns Decoded bounded plan evidence.
 * @throws Usage, file, JSON, or plan-validation failures.
 */
export function loadRequiredPlan(argv: readonly string[]): Promise<HygienePlan> {
  if (argv.length !== 2 || argv[0] !== "--plan" || !argv[1]) throw new TypeError("Usage requires --plan <path>");
  return fs.readValidatedJson(resolve(getWorkingDirectory(), argv[1]), decodeHygienePlan, MAX_REPORT_BYTES);
}
