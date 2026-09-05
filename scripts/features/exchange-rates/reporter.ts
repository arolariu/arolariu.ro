/**
 * @fileoverview Terminal presentation of one exchange-rate update outcome. Loaded only through the
 * command's `loadPresentation()` literal dynamic import, so a help, usage, or version path never
 * pays for it. It owns no business logic: a fully updated run keeps its success line and exit `0`,
 * a run with retained year failures keeps its warning line and exit `1`, and a typed failure is
 * reported with its original cause's message and the same bounded, secret-free evidence
 * `describeCommandFailureEvidence` produces for every other command.
 * @module scripts/features/exchange-rates/reporter
 */

import {describeCommandFailureEvidence, type FeatureCommandFailure} from "../../core/command/command-execution.ts";
import type {CommandPresentationDecision, CommandResultPresenterDefinition} from "../../core/command/command-specification.ts";
import type {ExchangeRateResult, ExchangeRateUpdateFailure} from "./workflow.ts";

const toFeatureFailure = ({cause}: Readonly<ExchangeRateUpdateFailure>): FeatureCommandFailure => ({
  kind: "operational",
  message: cause instanceof Error ? cause.message : String(cause),
  evidence: describeCommandFailureEvidence(cause),
  cause,
});

/** Presents one exchange-rate update result or typed failure. */
export const exchangeRateUpdatePresenter: CommandResultPresenterDefinition<ExchangeRateResult, ExchangeRateUpdateFailure> = {
  present: (result): CommandPresentationDecision<ExchangeRateResult> => {
    if (result.kind === "failed") return {kind: "fail", failure: toFeatureFailure(result.failure)};
    const {output} = result;
    const progress = `Updated ${output.updatedYears.length} of ${output.years.length} year(s)`;
    if (output.failedYears.length === 0) {
      return {kind: "complete", completion: {exitCode: 0, value: output, human: (presenter) => presenter.success(`${progress}.`)}};
    }

    const failures = output.failedYears.map((failure) => `${failure.year} (${failure.message})`).join(", ");
    return {
      kind: "complete",
      completion: {exitCode: 1, value: output, human: (presenter) => presenter.warn(`${progress}; failed: ${failures}.`)},
    };
  },
};
