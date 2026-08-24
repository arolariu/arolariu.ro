/**
 * @fileoverview Unit tests for AllergenAssessmentView component.
 * @module app/domains/invoices/_components/allergens/AllergenAssessmentView.test
 *
 * @remarks
 * All assertions on translated text use the key-path strings returned by the
 * `next-intl-selector` mock in `vitest.setup.ts` (e.g. `t((m) => m.allergens.view.status.detected)`
 * renders as "allergens.view.status.detected").
 *
 * Safety invariants:
 * - Never renders "safe", "allergen-free", or "no allergens" reassurance.
 * - `null` assessment renders distinctly from `noSignals`.
 * - `noSignals` and `insufficientData` render different text.
 */

import type {AllergenAssessment} from "@/types/invoices/Allergen";
import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel} from "@/types/invoices/Allergen";
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {AllergenAssessmentView} from "./AllergenAssessmentView";

const detectedAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.Milk,
      evidenceLevel: AllergenEvidenceLevel.Explicit,
      confidence: 0.92,
      evidence: [
        {source: "productLabel", value: "contains milk"},
        {source: "barcodeDatabase", value: "dairy product"},
      ],
    },
    {
      code: AllergenCode.Eggs,
      evidenceLevel: AllergenEvidenceLevel.Inferred,
      confidence: 0.75,
      evidence: [],
    },
  ],
};

const noSignalsAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.NoSignals,
  signals: [],
};

const insufficientDataAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.InsufficientData,
  signals: [],
};

describe("AllergenAssessmentView", () => {
  // ── 1. null assessment renders a neutral "not assessed" state ───────────────

  it("renders a not-assessed state when assessment is null", () => {
    render(<AllergenAssessmentView assessment={null} />);
    expect(screen.getByText(/allergens\.view\.notAssessed/i)).toBeInTheDocument();
  });

  // ── 2. detected status shows label, evidence level, and confidence ──────────

  it("renders the canonical label, evidence level, and confidence for a detected signal", () => {
    render(<AllergenAssessmentView assessment={detectedAssessment} />);

    // Status
    expect(screen.getByText(/allergens\.view\.status\.detected/i)).toBeInTheDocument();

    // Signal 1: Milk — confidence 92%
    expect(screen.getByText(/allergens\.codes\.milk/i)).toBeInTheDocument();
    expect(screen.getByText(/92%/)).toBeInTheDocument();

    // Signal 2: Eggs
    expect(screen.getByText(/allergens\.codes\.eggs/i)).toBeInTheDocument();
  });

  // ── 3. renders each evidence entry ─────────────────────────────────────────

  it("renders each evidence entry with source and value", () => {
    render(<AllergenAssessmentView assessment={detectedAssessment} />);
    expect(screen.getByText(/productLabel/)).toBeInTheDocument();
    expect(screen.getByText(/contains milk/)).toBeInTheDocument();
    expect(screen.getByText(/barcodeDatabase/)).toBeInTheDocument();
    expect(screen.getByText(/dairy product/)).toBeInTheDocument();
  });

  // ── 4. noSignals and insufficientData render DIFFERENT text ─────────────────

  it("noSignals and insufficientData render different status text", () => {
    const {unmount} = render(<AllergenAssessmentView assessment={noSignalsAssessment} />);
    const noSignalsText = screen.getByText(/allergens\.view\.status\.noSignals/i).textContent;
    unmount();

    render(<AllergenAssessmentView assessment={insufficientDataAssessment} />);
    const insufficientText = screen.getByText(/allergens\.view\.status\.insufficientData/i).textContent;

    expect(noSignalsText).not.toBe(insufficientText);
  });

  it("noSignals and insufficientData status notes are distinct", () => {
    const {unmount} = render(<AllergenAssessmentView assessment={noSignalsAssessment} />);
    const noSignalsNote = screen.getByText(/allergens\.view\.statusNote\.noSignals/i).textContent;
    unmount();

    render(<AllergenAssessmentView assessment={insufficientDataAssessment} />);
    const insufficientNote = screen.getByText(/allergens\.view\.statusNote\.insufficientData/i).textContent;

    expect(noSignalsNote).not.toBe(insufficientNote);
  });

  // ── 5. Safety: NEVER renders reassurance ────────────────────────────────────

  it("never renders reassurance words for a detected assessment", () => {
    render(<AllergenAssessmentView assessment={detectedAssessment} />);
    expect(screen.queryByText(/\bsafe\b|allergen[- ]free|no allergens\b/i)).not.toBeInTheDocument();
  });

  it("never renders reassurance words for a noSignals assessment", () => {
    render(<AllergenAssessmentView assessment={noSignalsAssessment} />);
    expect(screen.queryByText(/\bsafe\b|allergen[- ]free|no allergens\b/i)).not.toBeInTheDocument();
  });

  it("never renders reassurance words for a null assessment", () => {
    render(<AllergenAssessmentView assessment={null} />);
    expect(screen.queryByText(/\bsafe\b|allergen[- ]free|no allergens\b/i)).not.toBeInTheDocument();
  });

  // ── 6. null assessment is DISTINCT from noSignals ───────────────────────────

  it("null assessment and noSignals assessment render different UI", () => {
    const {container: nullContainer} = render(<AllergenAssessmentView assessment={null} />);
    const nullHtml = nullContainer.innerHTML;

    const {container: noSignalsContainer} = render(<AllergenAssessmentView assessment={noSignalsAssessment} />);
    const noSignalsHtml = noSignalsContainer.innerHTML;

    expect(nullHtml).not.toBe(noSignalsHtml);
  });

  it("noSignals renders its status key, not the notAssessed key", () => {
    render(<AllergenAssessmentView assessment={noSignalsAssessment} />);
    expect(screen.queryByText(/allergens\.view\.notAssessed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/allergens\.view\.status\.noSignals/i)).toBeInTheDocument();
  });
});
