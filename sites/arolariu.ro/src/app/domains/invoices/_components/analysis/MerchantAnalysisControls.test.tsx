/**
 * @fileoverview Unit tests for MerchantAnalysisControls component.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisControls.test
 *
 * @remarks
 * TDD suite that verifies:
 * 1. Profile radio selection emits the exact merchant preset capability shape.
 * 2. A "Custom" indicator appears when capabilities diverge from the active preset.
 * 3. The sole remaining enabled capability checkbox cannot be unchecked.
 *
 * All queries use accessible roles to simultaneously prove accessibility.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {AnalysisProfile, MerchantAnalysisCapabilities} from "@/types/invoices/Analysis";
import {resolveAnalysisCapabilities} from "@/types/invoices/Analysis";
import MerchantAnalysisControls from "./MerchantAnalysisControls";

describe("MerchantAnalysisControls", () => {
  // ── 1. Profile radio → exact merchant preset shape ─────────────────────────

  it("emits onChange with the exact preset shape when a profile radio is selected", async () => {
    const onChange = vi.fn();
    render(
      <MerchantAnalysisControls
        profile='fast'
        value={resolveAnalysisCapabilities("merchant", "fast")}
        onChange={onChange}
      />,
    );

    const comprehensiveRadio = screen.getByRole("radio", {name: /profiles\.comprehensive/i});
    await userEvent.click(comprehensiveRadio);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("comprehensive", resolveAnalysisCapabilities("merchant", "comprehensive"));
  });

  it("emits onChange with the balanced preset when the balanced profile radio is selected", async () => {
    const onChange = vi.fn();
    render(
      <MerchantAnalysisControls
        profile='fast'
        value={resolveAnalysisCapabilities("merchant", "fast")}
        onChange={onChange}
      />,
    );

    const balancedRadio = screen.getByRole("radio", {name: /profiles\.balanced/i});
    await userEvent.click(balancedRadio);

    expect(onChange).toHaveBeenCalledWith("balanced", resolveAnalysisCapabilities("merchant", "balanced"));
  });

  // ── 2. Custom indicator when diverged from preset ──────────────────────────

  it("shows a Custom indicator when capabilities diverge from the selected profile preset", () => {
    // balanced preset: descriptionGeneration = true → pass false to trigger divergence
    const divergedValue: MerchantAnalysisCapabilities = {
      ...resolveAnalysisCapabilities("merchant", "balanced"),
      descriptionGeneration: false,
    };

    render(
      <MerchantAnalysisControls
        profile='balanced'
        value={divergedValue}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/merchantAnalysisControls\.customLabel/i)).toBeInTheDocument();
  });

  // ── 3. Cannot disable the last remaining capability ─────────────────────────

  it("disables the sole enabled capability checkbox so zero capabilities cannot be submitted", () => {
    // Only merchantClassification enabled
    const lastOneValue: MerchantAnalysisCapabilities = {
      merchantClassification: true,
      descriptionGeneration: false,
    };

    render(
      <MerchantAnalysisControls
        profile='fast'
        value={lastOneValue}
        onChange={vi.fn()}
      />,
    );

    const merchantClassificationCheckbox = screen.getByRole("checkbox", {
      name: /capabilities\.merchantClassification/i,
    });
    expect(merchantClassificationCheckbox).toBeDisabled();
  });

  it("does not disable a capability checkbox when more than one capability is enabled", () => {
    const bothEnabled: MerchantAnalysisCapabilities = {
      merchantClassification: true,
      descriptionGeneration: true,
    };

    render(
      <MerchantAnalysisControls
        profile='balanced'
        value={bothEnabled}
        onChange={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeDisabled();
    }
  });

  it("emits updated capabilities when a capability checkbox is toggled", async () => {
    const onChange = vi.fn();
    const initialValue: MerchantAnalysisCapabilities = {
      merchantClassification: true,
      descriptionGeneration: false,
    };

    render(
      <MerchantAnalysisControls
        profile='fast'
        value={initialValue}
        onChange={onChange}
      />,
    );

    const descCheckbox = screen.getByRole("checkbox", {name: /capabilities\.descriptionGeneration/i});
    await userEvent.click(descCheckbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, emitted] = onChange.mock.calls[0] as [AnalysisProfile, MerchantAnalysisCapabilities];
    expect(emitted.descriptionGeneration).toBe(true);
  });
});
