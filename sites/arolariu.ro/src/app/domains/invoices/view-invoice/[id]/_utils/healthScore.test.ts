import {buildInvoice, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {describe, expect, it} from "vitest";
import {calculateHealthScorePercentage} from "./healthScore";

describe("calculateHealthScorePercentage", () => {
  it("includes zero-confidence products in the OCR-confidence denominator", () => {
    const invoice = buildInvoice({
      items: [
        buildProduct({metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 1}}),
        buildProduct({metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 0}}),
      ],
    });

    expect(calculateHealthScorePercentage(invoice)).toBe(60);
  });
});
