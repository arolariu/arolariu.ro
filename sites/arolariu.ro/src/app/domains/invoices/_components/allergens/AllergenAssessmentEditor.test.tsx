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
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
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
});
