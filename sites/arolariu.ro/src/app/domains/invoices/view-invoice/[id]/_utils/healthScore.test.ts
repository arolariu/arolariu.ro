import {describe, expect, it} from "vitest";
import {buildInvoice, buildProduct, buildRecipeSuggestion} from "../../../../../../../tests/helpers/builders/domain";
import {calculateHealthScorePercentage} from "./healthScore";

const category = 1007;

describe("calculateHealthScorePercentage", () => {
  it("scores a fully classified receipt with payment, merchant and recipe at 100%", () => {
    const invoice = buildInvoice({
      items: [buildProduct({category})],
      possibleRecipes: [buildRecipeSuggestion({description: "A quick meal from the receipt"})],
    });

    const score = calculateHealthScorePercentage(invoice);

    expect(score).toBe(100);
  });

  it("ignores deleted items and unknown OCR confidence when scoring a partially complete invoice", () => {
    const complete = buildProduct({category});
    const partial = buildProduct({category: null, metadata: {...complete.metadata, isComplete: false, confidence: 0.6}});
    const invoice = buildInvoice({
      items: [
        {...complete, metadata: {...complete.metadata, confidence: 0}},
        partial,
        {...complete, metadata: {...complete.metadata, isSoftDeleted: true}},
      ],
      merchantReference: "",
      paymentInformation: {...buildInvoice().paymentInformation, totalCostAmount: 0},
    });

    const score = calculateHealthScorePercentage(invoice);

    expect(score).toBe(42);
  });

  it("gives no credit for archived items, the empty merchant sentinel, or a transaction without currency", () => {
    const item = buildProduct({category});
    const payment = buildInvoice().paymentInformation;
    const invoice = buildInvoice({
      items: [{...item, metadata: {...item.metadata, isSoftDeleted: true}}],
      merchantReference: "00000000-0000-0000-0000-000000000000",
      paymentInformation: {...payment, currency: {...payment.currency, code: ""}},
    });

    const score = calculateHealthScorePercentage(invoice);

    expect(score).toBe(0);
  });
});
