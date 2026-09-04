/**
 * @fileoverview Terminal presentation of one end-to-end outcome. Loaded only through the command's
 * `loadPresentation()` literal dynamic import, so a help, usage, or version path never pays for it.
 * It owns no business logic: a completed run keeps its unchanged success line and exit `0`, and
 * every typed failure keeps the exact message and exit code the previously thrown error produced,
 * with the same bounded, secret-free evidence `describeCommandFailureEvidence` gives every command.
 * @module scripts/features/end-to-end/reporter */

import {describeCommandFailureEvidence, type FeatureCommandFailure} from "../../core/command/command-execution.ts";
import type {CommandPresentationDecision, CommandResultPresenterDefinition} from "../../core/command/command-specification.ts";
import type {EndToEndFailure, EndToEndResult} from "./workflow.ts";

function toFeatureFailure(failure: Readonly<EndToEndFailure>): FeatureCommandFailure {
  switch (failure.kind) {
    case "collection-missing":
      return {kind: "operational", message: `Collection file not found: ${failure.path}`, evidence: []};
    case "environment-missing":
      return {kind: "operational", message: `Environment file not found: ${failure.path}`, evidence: []};
    case "auth-token-missing":
      return {kind: "operational", message: `E2E_TEST_AUTH_TOKEN environment variable is required for ${failure.target}.`, evidence: []};
    case "newman-failed": {
      const {cause} = failure;
      const message = cause instanceof Error ? cause.message : String(cause);
      return {kind: "operational", message, evidence: describeCommandFailureEvidence(cause), cause};
    }
  }
}

/** Presents one end-to-end result or typed failure. */
export const endToEndPresenter: CommandResultPresenterDefinition<EndToEndResult, EndToEndFailure> = {
  present: (result): CommandPresentationDecision<EndToEndResult> => {
    if (result.kind === "failed") return {kind: "fail", failure: toFeatureFailure(result.failure)};
    const {output} = result;
    const summary = `Completed ${String(output.completed.length)} of ${String(output.targets.length)} E2E target(s)`;
    return {
      kind: "complete",
      completion: {exitCode: 0, value: output, human: (presenter) => presenter.success(`${summary}: ${output.completed.join(", ")}.`)},
    };
  },
};
