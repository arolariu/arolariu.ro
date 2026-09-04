// @vitest-environment node
/**
 * @fileoverview Vitest-discovered owner of the shared process-runner contract.
 * @module scripts/testing/contracts/process-runner.contract.test
 */

import {buildProgrammableProcessRunner} from "../builders/process-result.builder.ts";
import {runProcessRunnerContract} from "./process-runner.contract.ts";

runProcessRunnerContract({
  label: "ProgrammableProcessRunner",
  createRunner: buildProgrammableProcessRunner,
});
