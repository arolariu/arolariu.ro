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

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {AnalysisProfile, InvoiceAnalysisCapabilities} from "@/types/invoices/Analysis";
import {resolveInvoiceCapabilities} from "@/types/invoices/Analysis";
import InvoiceAnalysisControls from "./InvoiceAnalysisControls";

describe("InvoiceAnalysisControls", () => {
  // ── 1. Profile radio → exact preset shape ──────────────────────────────────

  it("emits onChange with the exact preset shape when a profile radio is selected", async () => {
    const onChange = vi.fn();
    render(
      <InvoiceAnalysisControls
        profile='fast'
        value={resolveInvoiceCapabilities("fast")}
        onChange={onChange}
      />,
    );

    const balancedRadio = screen.getByRole("radio", {name: /profiles\.balanced/i});
    await userEvent.click(balancedRadio);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("balanced", resolveInvoiceCapabilities("balanced"));
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
      ...resolveInvoiceCapabilities("balanced"),
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
      ...resolveInvoiceCapabilities("balanced"),
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
      ...resolveInvoiceCapabilities("fast"),
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
      ...resolveInvoiceCapabilities("fast"),
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
});
