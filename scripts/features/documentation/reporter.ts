/**
 * @fileoverview Terminal presentation of one documentation assembly outcome. Loaded only through the
 * command's `loadPresentation()` literal dynamic import, so a help, usage, or version path never
 * pays for it. It owns no business logic: a typed failure is reported with its original cause's
 * message and the same bounded, secret-free evidence `describeCommandFailureEvidence` produces for
 * every other command, which keeps the failure transcript identical to the pre-migration one.
 * @module scripts/features/documentation/reporter
 */

import {describeCommandFailureEvidence, type FeatureCommandFailure} from "../../core/command/command-execution.ts";
import type {CommandPresentationDecision, CommandResultPresenterDefinition} from "../../core/command/command-specification.ts";
import type {DocumentationAssemblyFailure, DocumentationAssemblyResult} from "./workflow.ts";

const toFeatureFailure = ({cause}: Readonly<DocumentationAssemblyFailure>): FeatureCommandFailure => ({
  kind: "operational",
  message: cause instanceof Error ? cause.message : String(cause),
  evidence: describeCommandFailureEvidence(cause),
  cause,
});

/** Presents one documentation assembly result or typed failure. */
export const documentationAssemblyPresenter: CommandResultPresenterDefinition<DocumentationAssemblyResult, DocumentationAssemblyFailure> = {
  present: (result): CommandPresentationDecision<DocumentationAssemblyResult> => {
    if (result.kind === "failed") return {kind: "fail", failure: toFeatureFailure(result.failure)};
    const {output} = result;
    const tiers = String(output.generatedTiers.length);
    return {
      kind: "complete",
      completion: {
        exitCode: 0,
        value: output,
        human: (presenter) =>
          presenter.success(`Assembled documentation from ${String(output.extractorCount)} extractor(s) across ${tiers} tier(s).`),
      },
    };
  },
};
