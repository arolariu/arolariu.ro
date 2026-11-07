import {describe, expect, it} from "vitest";
import {plan as evidencePlan} from "../hygiene/fixtures/outcomes.ts";
import {summarizePlanSelection} from "./presentation.ts";

describe("planning presentation", () => {
  it("treats shared and repository-wide changes as normal selection, not warnings", () => {
    const summary = summarizePlanSelection({
      ...evidencePlan(),
      diagnostics: [
        {code: "shared-input", message: "Shared configuration changed"},
        ...Array.from({length: 100}, (_, index) => ({code: "unmapped-change", message: `unowned/file-${index}.json`})),
      ],
    });
    expect(summary.level).toBe("info");
    expect(summary.message).toBe("Full validation selected because shared configuration changed.");
    expect(summary.message).not.toContain("unowned");
  });

  it("keeps an inspection failure visible even when routine full-scope reasons are present", () => {
    const summary = summarizePlanSelection({
      ...evidencePlan(),
      diagnostics: [
        {code: "shared-input", message: "Shared configuration changed"},
        {code: "workspace-invalid", message: "Invalid graph"},
      ],
    });
    expect(summary.level).toBe("warning");
    expect(summary.message).toContain("Workspace inspection returned invalid data");
  });

  it("surfaces unrecognized fallback reasons instead of silently classifying them as routine", () => {
    const summary = summarizePlanSelection({
      ...evidencePlan(),
      diagnostics: [{code: "future-inspection-failure", message: "Diagnostic detail"}],
    });
    expect(summary.level).toBe("warning");
    expect(summary.message).toContain("could not be determined reliably");
  });
});
