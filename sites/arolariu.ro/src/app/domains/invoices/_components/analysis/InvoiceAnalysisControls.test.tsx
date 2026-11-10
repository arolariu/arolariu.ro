/**
 * @fileoverview Unit tests for InvoiceAnalysisControls component.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test
 *
 * @remarks
 * TDD suite that verifies:
 * 1. Profile radio selection emits the exact preset capability shape.
 * 2. Enabling allergenAssessment pulls in productClassification (dependency closure).
 * 3. A "Custom" indicator appears when capabilities diverge from the active preset.
 * 4. The maximumRecipes spinbutton is disabled when recipeGeneration is off.
 * 5. The sole remaining enabled capability checkbox cannot be unchecked.
 * 6. When manualClassificationPresent is true, invoiceClassification is unchecked and
 *    clicking it surfaces a role="alert" whose text mentions overwriting.
 *
 * All queries use accessible roles to simultaneously prove accessibility.
 */

import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {AnalysisProfile, InvoiceAnalysisCapabilities} from "@/types/invoices/Analysis";
import {resolveAnalysisCapabilities} from "@/types/invoices/Analysis";
import InvoiceAnalysisControls from "./InvoiceAnalysisControls";

/**
 * Runs `action` while swallowing window ErrorEvents React dispatches for event-handler throws.
 * Returns the captured error messages so the test can assert the handler rejected the malformed DOM value.
 */
async function captureHandlerErrors(action: () => Promise<void> | void): Promise<string[]> {
  const messages: string[] = [];
  const listener = (event: ErrorEvent): void => {
    event.preventDefault();
    messages.push(event.error instanceof Error ? event.error.message : String(event.message));
  };
  window.addEventListener("error", listener);
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    await action();
  } finally {
    window.removeEventListener("error", listener);
    consoleSpy.mockRestore();
  }
  return messages;
}
describe("InvoiceAnalysisControls", () => {
  // ── 1. Profile radio → exact preset shape ──────────────────────────────────

  it("emits onChange with the exact preset shape when a profile radio is selected", async () => {
    const onChange = vi.fn();
    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={resolveAnalysisCapabilities("invoice", "fast")}
        onChange={onChange}
      />,
    );

    const balancedRadio = screen.getByRole("radio", {name: /profiles\.balanced/i});
    await userEvent.click(balancedRadio);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("balanced", resolveAnalysisCapabilities("invoice", "balanced"));
  });

  // ── 2. Dependency closure: allergenAssessment pulls in productClassification ─

  it("enables productClassification when allergenAssessment is enabled (dependency closure)", async () => {
    const onChange = vi.fn();
    const initialValue: InvoiceAnalysisCapabilities = {
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0,
    };

    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={initialValue}
        onChange={onChange}
      />,
    );

    const allergenCheckbox = screen.getByRole("checkbox", {name: /capabilities\.allergenAssessment/i});
    await userEvent.click(allergenCheckbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, emitted] = onChange.mock.calls[0] as [AnalysisProfile, InvoiceAnalysisCapabilities];
    expect(emitted.allergenAssessment).toBe(true);
    expect(emitted.productClassification).toBe(true);
  });

  // ── 3. Custom indicator when diverged from preset ───────────────────────────

  it("shows a Custom indicator when capabilities diverge from the selected profile preset", () => {
    // balanced preset: invoiceSummary = true → pass false to trigger divergence
    const divergedValue: InvoiceAnalysisCapabilities = {
      ...resolveAnalysisCapabilities("invoice", "balanced"),
      invoiceSummary: false,
    };

    render(
      <InvoiceAnalysisControls
        profile='balanced'
        value={divergedValue}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/invoiceAnalysisControls\.customLabel/i)).toBeInTheDocument();
  });

  // ── 4. maximumRecipes disabled when recipeGeneration is off ─────────────────

  it("disables the maximumRecipes spinbutton when recipeGeneration is off", () => {
    const noRecipeValue: InvoiceAnalysisCapabilities = {
      ...resolveAnalysisCapabilities("invoice", "balanced"),
      recipeGeneration: false,
      maximumRecipes: 0,
    };

    render(
      <InvoiceAnalysisControls
        profile='balanced'
        value={noRecipeValue}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });

  // ── 5. Cannot disable the last remaining capability ─────────────────────────

  it("disables the sole enabled capability checkbox so zero capabilities cannot be submitted", () => {
    const lastOneValue: InvoiceAnalysisCapabilities = {
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0,
    };

    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={lastOneValue}
        onChange={vi.fn()}
      />,
    );

    const documentExtractionCheckbox = screen.getByRole("checkbox", {
      name: /capabilities\.documentExtraction/i,
    });
    expect(documentExtractionCheckbox).toBeDisabled();
  });

  // ── 6. manualClassificationPresent: unchecked + overwrite alert ─────────────

  it("renders invoiceClassification as unchecked when manualClassificationPresent is true", () => {
    const value: InvoiceAnalysisCapabilities = {
      ...resolveAnalysisCapabilities("invoice", "fast"),
      invoiceClassification: false,
    };

    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={value}
        manualClassificationPresent
        onChange={vi.fn()}
      />,
    );

    const classificationCheckbox = screen.getByRole("checkbox", {
      name: /capabilities\.invoiceClassification/i,
    });
    expect(classificationCheckbox).not.toBeChecked();
  });

  it("surfaces a role=alert mentioning overwriting when invoiceClassification is clicked with manualClassificationPresent", async () => {
    const value: InvoiceAnalysisCapabilities = {
      ...resolveAnalysisCapabilities("invoice", "fast"),
      invoiceClassification: false,
    };

    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={value}
        manualClassificationPresent
        onChange={vi.fn()}
      />,
    );

    const classificationCheckbox = screen.getByRole("checkbox", {
      name: /capabilities\.invoiceClassification/i,
    });
    await userEvent.click(classificationCheckbox);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/overwrite/i);
  });

  it("emits the parsed maximumRecipes when the spinbutton changes and ignores a cleared (NaN) value", () => {
    const onChange = vi.fn();
    const value: InvoiceAnalysisCapabilities = {...resolveAnalysisCapabilities("invoice", "comprehensive"), maximumRecipes: 2};
    render(
      <InvoiceAnalysisControls
        profile='comprehensive'
        value={value}
        onChange={onChange}
      />,
    );

    const spinbutton = screen.getByRole("spinbutton");
    fireEvent.change(spinbutton, {target: {value: "3"}});

    expect(onChange).toHaveBeenCalledTimes(1);
    const [profile, emitted] = onChange.mock.calls[0] as [AnalysisProfile, InvoiceAnalysisCapabilities];
    expect(profile).toBe("comprehensive");
    expect(emitted.maximumRecipes).toBe(3);

    onChange.mockClear();
    fireEvent.change(spinbutton, {target: {value: ""}});
    expect(onChange).not.toHaveBeenCalled();
  });

  it("defensive invariant: rejects an unsupported profile radio value without calling onChange", async () => {
    const onChange = vi.fn();
    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={resolveAnalysisCapabilities("invoice", "fast")}
        onChange={onChange}
      />,
    );
    const radio = screen.getByRole<HTMLInputElement>("radio", {name: /profiles\.balanced/i});
    radio.value = "bogus";

    const errors = await captureHandlerErrors(() => userEvent.click(radio));

    expect(errors).toContain("Unsupported invoice analysis profile: bogus");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("defensive invariant: rejects an unsupported capability checkbox value without calling onChange", async () => {
    const onChange = vi.fn();
    render(
      <InvoiceAnalysisControls
        profile='balanced'
        value={resolveAnalysisCapabilities("invoice", "balanced")}
        onChange={onChange}
      />,
    );
    const checkbox = screen.getAllByRole<HTMLInputElement>("checkbox").find((box) => !box.disabled);
    expect(checkbox).toBeDefined();
    if (checkbox === undefined) return;
    checkbox.value = "bogus";

    const errors = await captureHandlerErrors(() => userEvent.click(checkbox));

    expect(errors).toContain("Unsupported invoice analysis capability: bogus");
    expect(onChange).not.toHaveBeenCalled();
  });
});
