import {ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {MerchantBuilder, generateRandomMerchants} from "./merchant";

describe("MerchantBuilder", () => {
  it("builds a complete NACE-aligned merchant DTO", () => {
    const merchant = new MerchantBuilder().withName("Market").build();

    expect(merchant).toMatchObject({name: "Market", classification: {system: ClassificationSystem.Nace21}});
    expect(merchant.referencedInvoiceIds).toEqual([]);
  });

  it("builds complete independent merchants", () => {
    expect(generateRandomMerchants(2)).toHaveLength(2);
  });
});
