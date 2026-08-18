import {AllergenAssessmentStatus, ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {ProductBuilder, generateRandomProducts} from "./product";

describe("ProductBuilder", () => {
  it("builds a complete GPC-aligned product DTO", () => {
    const product = new ProductBuilder().withName("Milk").withPrice(5).withQuantity(2).build();

    expect(product).toMatchObject({name: "Milk", totalPrice: 10, classification: {system: ClassificationSystem.Gs1Gpc}});
    expect(product.metadata.isComplete).toBe(true);
  });

  it("keeps a no-signals result distinct from a detected assessment", () => {
    const product = new ProductBuilder().withDetectedAllergenSignals().build();

    expect(product.allergenAssessment?.status).toBe(AllergenAssessmentStatus.Detected);
    expect(product.allergenAssessment?.signals).toHaveLength(1);
  });

  it("builds complete independent products", () => {
    expect(generateRandomProducts(3)).toHaveLength(3);
  });
});
