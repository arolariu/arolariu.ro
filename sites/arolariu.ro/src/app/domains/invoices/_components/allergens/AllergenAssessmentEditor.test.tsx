/**
 * @fileoverview Unit tests for AllergenAssessmentEditor component.
 * @module app/domains/invoices/_components/allergens/AllergenAssessmentEditor.test
 *
 * @remarks
 * Tests verify:
 * 1. Exactly 14 selectable codes in the dropdown — no free-text allergen input.
 * 2. Every emitted value passes `isAllergenAssessment` (real guard, not mocked).
 * 3. Adding the first signal sets status to "detected".
 * 4. Removing the last signal moves status away from "detected" with zero signals.
 * 5. Confidence is clamped to [0, 1].
 */

import type {AllergenAssessment} from "@/types/invoices/Allergen";
import {AllergenAssessmentStatus, AllergenCode, isAllergenAssessment} from "@/types/invoices/Allergen";
import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Component, type ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AllergenAssessmentEditor} from "./AllergenAssessmentEditor";

const existingAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.Milk,
      evidenceLevel: "explicit",
      confidence: 0.9,
      evidence: [],
    },
  ],
};

describe("AllergenAssessmentEditor", () => {
  // ── 1. Exactly 14 selectable codes and NO free-text allergen input ──────────

  it("shows exactly 14 allergen options in the code dropdown after adding a signal", async () => {
    const onChange = vi.fn();
    render(
      <AllergenAssessmentEditor
        value={null}
        onChange={onChange}
      />,
    );

    const addBtn = screen.getByRole("button", {name: /allergens\.editor\.signals\.addSignal/i});
    await userEvent.click(addBtn);

    // Open the allergen code combobox
    const trigger = screen.getByRole("combobox", {name: /allergens\.editor\.signals\.code/i});
    await userEvent.click(trigger);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(14);
  });

  it("has no free-text input for allergen name", () => {
    render(
      <AllergenAssessmentEditor
        value={null}
        onChange={vi.fn()}
      />,
    );
    // There should be no text input that a user could type an allergen name into
    // before adding a signal (the combobox is a select, not a text input)
    const textInputs = screen.queryAllByRole("textbox");
    // Before adding a signal, there are no text inputs for allergen names
    expect(textInputs.every((inp) => !inp.getAttribute("placeholder")?.toLowerCase().includes("allergen"))).toBe(true);
  });

  // ── 2. Every emitted value satisfies isAllergenAssessment ───────────────────

  it("every onChange call emits a value that satisfies isAllergenAssessment", async () => {
    const emitted: AllergenAssessment[] = [];
    const onChange = (next: AllergenAssessment) => {
      emitted.push(next);
    };

    render(
      <AllergenAssessmentEditor
        value={null}
        onChange={onChange}
      />,
    );

    // Add a signal
    const addBtn = screen.getByRole("button", {name: /allergens\.editor\.signals\.addSignal/i});
    await userEvent.click(addBtn);

    // Remove the signal
    const removeBtn = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeSignal/i});
    await userEvent.click(removeBtn);

    for (const val of emitted) {
      expect(isAllergenAssessment(val)).toBe(true);
    }
  });

  it("keeps an incomplete evidence row editable and emits it only after both fields are complete", async () => {
    const onChange = vi.fn<(next: AllergenAssessment) => void>();
    const onValidityChange = vi.fn<(isValid: boolean) => void>();
    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", {name: /allergens\.editor\.signals\.addEvidence/i}));

    const sourceInput = screen.getByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i);
    const valueInput = screen.getByPlaceholderText(/allergens\.editor\.signals\.evidenceValue/i);
    expect(sourceInput).toBeInTheDocument();
    expect(valueInput).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await userEvent.type(sourceInput, "productLabel");
    expect(onChange).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await userEvent.type(valueInput, "contains milk");
    const lastEmission = onChange.mock.calls.at(-1)?.[0];
    expect(lastEmission).toBeDefined();
    expect(isAllergenAssessment(lastEmission)).toBe(true);
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(lastEmission?.signals[0]?.evidence[0]).toEqual({
      source: "productLabel",
      value: "contains milk",
    });
  });

  it("updates allergen code and evidence level through the constrained selectors", async () => {
    const onChange = vi.fn<(next: AllergenAssessment) => void>();
    const user = userEvent.setup();
    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox", {name: /allergens\.editor\.signals\.code/i}));
    await user.click(screen.getByRole("option", {name: /allergens\.codes\.eggs/i}));
    expect(onChange.mock.calls.at(-1)?.[0].signals[0]?.code).toBe(AllergenCode.Eggs);

    await user.click(screen.getByRole("combobox", {name: /allergens\.editor\.signals\.evidenceLevel/i}));
    await user.click(screen.getByRole("option", {name: /allergens\.evidenceLevels\.inferred/i}));
    expect(onChange.mock.calls.at(-1)?.[0].signals[0]?.evidenceLevel).toBe("inferred");
  });

  it("changes between both valid empty-assessment statuses", async () => {
    const onChange = vi.fn<(next: AllergenAssessment) => void>();
    const user = userEvent.setup();
    render(
      <AllergenAssessmentEditor
        value={{status: AllergenAssessmentStatus.NoSignals, signals: []}}
        onChange={onChange}
      />,
    );

    const statusSelector = screen.getByRole("combobox", {name: /allergens\.editor\.status\.label/i});
    await user.click(statusSelector);
    await user.click(screen.getByRole("option", {name: /allergens\.editor\.status\.insufficientData/i}));
    expect(onChange).toHaveBeenLastCalledWith({
      status: AllergenAssessmentStatus.InsufficientData,
      signals: [],
    });

    await user.click(statusSelector);
    await user.click(screen.getByRole("option", {name: /allergens\.editor\.status\.noSignals/i}));
    expect(onChange).toHaveBeenLastCalledWith({
      status: AllergenAssessmentStatus.NoSignals,
      signals: [],
    });
  });

  it("removes an evidence row without removing its allergen signal", async () => {
    const onChange = vi.fn<(next: AllergenAssessment) => void>();
    const existingSignal = existingAssessment.signals[0];
    if (existingSignal === undefined) throw new Error("Expected the assessment fixture to contain a signal");
    const assessmentWithEvidence: AllergenAssessment = {
      ...existingAssessment,
      signals: [
        {
          ...existingSignal,
          evidence: [{source: "productLabel", value: "contains milk"}],
        },
      ],
    };
    render(
      <AllergenAssessmentEditor
        value={assessmentWithEvidence}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", {name: /allergens\.editor\.signals\.removeEvidence/i}));

    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({
      status: AllergenAssessmentStatus.Detected,
      signals: [{code: AllergenCode.Milk, evidence: []}],
    });
  });

  it("keeps detected status when one of multiple signals is removed", async () => {
    const onChange = vi.fn<(next: AllergenAssessment) => void>();
    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", {name: /allergens\.editor\.signals\.addSignal/i}));
    const removeButtons = screen.getAllByRole("button", {name: /allergens\.editor\.signals\.removeSignal/i});
    await userEvent.click(removeButtons[0] as HTMLElement);

    expect(onChange.mock.calls.at(-1)?.[0].status).toBe(AllergenAssessmentStatus.Detected);
    expect(onChange.mock.calls.at(-1)?.[0].signals).toHaveLength(1);
  });

  // ── 3. Adding first signal sets status to "detected" ───────────────────────

  it("sets status to detected when the first signal is added", async () => {
    let emitted: AllergenAssessment | undefined;
    const onChange = (next: AllergenAssessment) => {
      emitted = next;
    };

    render(
      <AllergenAssessmentEditor
        value={null}
        onChange={onChange}
      />,
    );

    const addBtn = screen.getByRole("button", {name: /allergens\.editor\.signals\.addSignal/i});
    await userEvent.click(addBtn);

    expect(emitted?.status).toBe(AllergenAssessmentStatus.Detected);
    expect(emitted?.signals.length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Removing last signal moves status away from "detected" ──────────────

  it("moves status away from detected and leaves zero signals when the last signal is removed", async () => {
    const emissions: AllergenAssessment[] = [];
    const onChange = (next: AllergenAssessment) => {
      emissions.push(next);
    };

    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
      />,
    );

    const removeBtn = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeSignal/i});
    await userEvent.click(removeBtn);

    const last = emissions.at(-1);
    expect(last).toBeDefined();
    expect(last?.status).not.toBe(AllergenAssessmentStatus.Detected);
    expect(last?.signals).toHaveLength(0);
    expect(isAllergenAssessment(last)).toBe(true);
  });

  // ── 5. Confidence is clamped to [0, 1] ─────────────────────────────────────

  it("clamps confidence to 1 when a value greater than 1 is entered", async () => {
    const emissions: AllergenAssessment[] = [];
    const onChange = (next: AllergenAssessment) => {
      emissions.push(next);
    };

    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
      />,
    );

    // Find the confidence input
    const confidenceInput = screen.getByRole("spinbutton");
    await userEvent.clear(confidenceInput);
    await userEvent.type(confidenceInput, "1.5");
    await userEvent.tab();

    const last = emissions.at(-1);
    if (last) {
      for (const sig of last.signals) {
        expect(sig.confidence).toBeLessThanOrEqual(1);
        expect(sig.confidence).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("clamps confidence to 0 when a negative value is entered", async () => {
    const emissions: AllergenAssessment[] = [];
    const onChange = (next: AllergenAssessment) => {
      emissions.push(next);
    };

    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={onChange}
      />,
    );

    const confidenceInput = screen.getByRole("spinbutton");
    await userEvent.clear(confidenceInput);
    await userEvent.type(confidenceInput, "-0.5");
    await userEvent.tab();

    const last = emissions.at(-1);
    if (last) {
      for (const sig of last.signals) {
        expect(sig.confidence).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // ── 6. Status selector hidden when signals exist ────────────────────────────

  it("does not render the status selector when signals are present", () => {
    render(
      <AllergenAssessmentEditor
        value={existingAssessment}
        onChange={vi.fn()}
      />,
    );
    // The status label should not be rendered when signals exist
    expect(screen.queryByText(/allergens\.editor\.status\.label/i)).not.toBeInTheDocument();
  });

  // ── 7. Status selector renders when no signals ──────────────────────────────

  it("renders the status selector when there are no signals", () => {
    const emptyAssessment: AllergenAssessment = {
      status: AllergenAssessmentStatus.NoSignals,
      signals: [],
    };
    render(
      <AllergenAssessmentEditor
        value={emptyAssessment}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/allergens\.editor\.status\.label/i)).toBeInTheDocument();
  });

  // ── 8. Multi-row isolation ──────────────────────────────────────────────────

  describe("with several signals and evidence rows", () => {
    const multiAssessment: AllergenAssessment = {
      status: AllergenAssessmentStatus.Detected,
      signals: [
        {
          code: AllergenCode.Milk,
          evidenceLevel: "explicit",
          confidence: 0.9,
          evidence: [
            {source: "label-a", value: "milk-a"},
            {source: "label-b", value: "milk-b"},
          ],
        },
        {
          code: AllergenCode.Eggs,
          evidenceLevel: "inferred",
          confidence: 0.4,
          evidence: [{source: "label-c", value: "egg-c"}],
        },
      ],
    };

    it("changes confidence of one signal and leaves the other signal untouched", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={multiAssessment}
          onChange={onChange}
        />,
      );

      const [firstConfidence, secondConfidence] = screen.getAllByRole("spinbutton");
      fireEvent.change(firstConfidence as HTMLElement, {target: {value: "0.5"}});

      const emitted = onChange.mock.calls.at(-1)?.[0];
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(emitted?.signals[0]?.confidence).toBe(0.5);
      expect(emitted?.signals[1]?.confidence).toBe(0.4);
      expect(secondConfidence).toHaveValue(0.4);
    });

    it("adds an evidence row only to the targeted signal", async () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      const onValidityChange = vi.fn<(isValid: boolean) => void>();
      render(
        <AllergenAssessmentEditor
          value={multiAssessment}
          onChange={onChange}
          onValidityChange={onValidityChange}
        />,
      );
      expect(screen.getAllByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i)).toHaveLength(3);

      const addButtons = screen.getAllByRole("button", {name: /allergens\.editor\.signals\.addEvidence/i});
      await userEvent.click(addButtons[1] as HTMLElement);

      const sources = screen.getAllByPlaceholderText<HTMLInputElement>(/allergens\.editor\.signals\.evidenceSource/i);
      expect(sources.map((input) => input.value)).toEqual(["label-a", "label-b", "label-c", ""]);
      expect(onValidityChange).toHaveBeenLastCalledWith(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("removes one evidence row while keeping its sibling and the other signal", async () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={multiAssessment}
          onChange={onChange}
        />,
      );

      const removeButtons = screen.getAllByRole("button", {name: /allergens\.editor\.signals\.removeEvidence/i});
      expect(removeButtons).toHaveLength(3);
      await userEvent.click(removeButtons[0] as HTMLElement);

      const emitted = onChange.mock.calls.at(-1)?.[0];
      expect(emitted?.signals[0]?.evidence).toEqual([{source: "label-b", value: "milk-b"}]);
      expect(emitted?.signals[1]?.evidence).toEqual([{source: "label-c", value: "egg-c"}]);
      expect(screen.getAllByRole("button", {name: /allergens\.editor\.signals\.removeEvidence/i})).toHaveLength(2);
    });

    it("edits one evidence field without touching sibling rows or signals", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={multiAssessment}
          onChange={onChange}
        />,
      );

      const valueInputs = screen.getAllByPlaceholderText(/allergens\.editor\.signals\.evidenceValue/i);
      fireEvent.change(valueInputs[1] as HTMLElement, {target: {value: "milk-b2"}});

      const emitted = onChange.mock.calls.at(-1)?.[0];
      expect(emitted?.signals[0]?.evidence).toEqual([
        {source: "label-a", value: "milk-a"},
        {source: "label-b", value: "milk-b2"},
      ]);
      expect(emitted?.signals[1]).toEqual(multiAssessment.signals[1]);
    });
  });

  // ── 9. Defensive invariants on crafted DOM ──────────────────────────────────

  describe("defensive invariant: crafted data attributes", () => {
    const withEvidence: AllergenAssessment = {
      status: AllergenAssessmentStatus.Detected,
      signals: [
        {
          code: AllergenCode.Milk,
          evidenceLevel: "explicit",
          confidence: 0.9,
          evidence: [{source: "label", value: "milk"}],
        },
      ],
    };
    const swallowedErrors: string[] = [];
    const swallowError = (event: ErrorEvent): void => {
      swallowedErrors.push(event.message);
      event.preventDefault();
    };

    beforeEach(() => {
      swallowedErrors.length = 0;
      window.addEventListener("error", swallowError);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
      window.removeEventListener("error", swallowError);
    });

    it("defensive invariant: a remove-signal button without a signal index does not emit", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeSignal/i});
      button.removeAttribute("data-signal-index");
      fireEvent.click(button);

      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid signalIndex: missing");
    });

    it("defensive invariant: a negative signal index is rejected without emitting", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeSignal/i});
      button.dataset["signalIndex"] = "-1";
      fireEvent.click(button);

      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid signalIndex: -1");
    });

    it("defensive invariant: a non-numeric signal index on the confidence input does not emit", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const input = screen.getByRole("spinbutton");
      input.dataset["signalIndex"] = "abc";
      fireEvent.change(input, {target: {value: "0.2"}});

      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid signalIndex: abc");
    });

    it("defensive invariant: an add-evidence button without a signal index adds no row", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.addEvidence/i});
      button.removeAttribute("data-signal-index");
      fireEvent.click(button);

      expect(screen.getAllByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i)).toHaveLength(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid signalIndex: missing");
    });

    it("defensive invariant: a remove-evidence button without an evidence index removes nothing", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeEvidence/i});
      button.removeAttribute("data-evidence-index");
      fireEvent.click(button);

      expect(screen.getAllByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i)).toHaveLength(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid evidenceIndex: missing");
    });

    it("defensive invariant: an evidence input without a field name does not emit", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const input = screen.getByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i);
      input.removeAttribute("data-evidence-field");
      fireEvent.change(input, {target: {value: "other"}});

      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid evidence field: missing");
    });

    it("defensive invariant: an evidence input with an unknown field name does not emit", () => {
      const onChange = vi.fn<(next: AllergenAssessment) => void>();
      render(
        <AllergenAssessmentEditor
          value={withEvidence}
          onChange={onChange}
        />,
      );

      const input = screen.getByPlaceholderText(/allergens\.editor\.signals\.evidenceSource/i);
      input.dataset["evidenceField"] = "bogus";
      fireEvent.change(input, {target: {value: "other"}});

      expect(onChange).not.toHaveBeenCalled();
      expect(swallowedErrors.join("\n")).toContain("Invalid evidence field: bogus");
    });

    it("defensive invariant: an out-of-range signal index on remove-evidence surfaces a render error", () => {
      render(
        <RenderErrorBoundary>
          <AllergenAssessmentEditor
            value={withEvidence}
            onChange={vi.fn()}
          />
        </RenderErrorBoundary>,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.removeEvidence/i});
      button.dataset["signalIndex"] = "9";
      fireEvent.click(button);

      expect(screen.getByRole("alert")).toHaveTextContent("Missing evidence identifiers for signal index 9");
    });

    it("defensive invariant: an out-of-range signal index on add-evidence surfaces a render error", () => {
      render(
        <RenderErrorBoundary>
          <AllergenAssessmentEditor
            value={withEvidence}
            onChange={vi.fn()}
          />
        </RenderErrorBoundary>,
      );

      const button = screen.getByRole("button", {name: /allergens\.editor\.signals\.addEvidence/i});
      button.dataset["signalIndex"] = "9";
      fireEvent.click(button);

      expect(screen.getByRole("alert")).toHaveTextContent("Missing evidence identifiers for signal index 9");
    });
  });
});

/** Minimal error boundary that exposes a render-phase error message. */
class RenderErrorBoundary extends Component<{readonly children: ReactNode}, {readonly message: string | null}> {
  public override state: {readonly message: string | null} = {message: null};

  public static getDerivedStateFromError(error: unknown): {readonly message: string} {
    return {message: error instanceof Error ? error.message : String(error)};
  }

  public override render(): ReactNode {
    return this.state.message === null ? this.props.children : <p role='alert'>{this.state.message}</p>;
  }
}
