import type {Invoice} from "@/types/invoices";
import {singleCurrencyFixture} from "./single-currency.fixtures";

/**
 * Mirrors single-currency fixture but flips every other invoice's currency
 * to RON (with realistic conversion ~5x). Used to verify per-currency
 * grouping in aggregators.
 */
export function multiCurrencyFixture(asOf?: Date): ReadonlyArray<Invoice> {
  const base = singleCurrencyFixture(asOf);
  return base.map((inv, idx) => {
    if (idx % 2 === 0) return inv;
    const ronTotal = Number((inv.paymentInformation.totalCostAmount * 5).toFixed(2));
    return {
      ...inv,
      id: inv.id.replace("eur", "ron"),
      paymentInformation: {
        ...inv.paymentInformation,
        currency: "RON",
        totalCostAmount: ronTotal,
      },
      items: inv.items.map((item) => ({
        ...item,
        price: Number((item.price * 5).toFixed(2)),
        totalPrice: Number((item.totalPrice * 5).toFixed(2)),
      })),
    };
  });
}