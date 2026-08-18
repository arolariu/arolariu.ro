import {describe, expect, it} from "vitest";
import {getCreateAnalysisOverrides} from "./CreateInvoiceContext";

describe("getCreateAnalysisOverrides", () => {
  it("disables automatic classification only after the manual patch succeeded", () => {
    expect(getCreateAnalysisOverrides(true)).toEqual({invoiceClassification: {enabled: false}});
  });

  it("keeps automatic classification enabled after a retryable manual patch failure", () => {
    expect(getCreateAnalysisOverrides(false)).toEqual({});
  });
});
