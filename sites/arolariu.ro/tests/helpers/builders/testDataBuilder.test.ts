import {ClassificationSystem} from "../../../src/types/invoices";
import {describe, expect, it} from "vitest";
import {TestDataBuilder} from "./testDataBuilder";

describe("TestDataBuilder", () => {
  it("routes structured canonical builder inputs", () => {
    expect(TestDataBuilder.build("classification", {system: ClassificationSystem.Gs1Gpc}).system).toBe(ClassificationSystem.Gs1Gpc);
    expect(TestDataBuilder.build("allergenAssessment").signals).toEqual([]);
    expect(TestDataBuilder.build("invoiceAnalysisRequest").profile).toBe("balanced");
    expect(TestDataBuilder.build("merchantAnalysisRequest").profile).toBe("balanced");
  });
});
