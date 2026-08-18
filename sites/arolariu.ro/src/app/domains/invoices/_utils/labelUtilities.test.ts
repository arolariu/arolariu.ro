import {PaymentType} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {getPaymentTypeLabel} from "./labelUtilities";

describe("getPaymentTypeLabel", () => {
  it("labels every published payment type", () => {
    expect(getPaymentTypeLabel(PaymentType.Unknown)).toBe("Unknown");
    expect(getPaymentTypeLabel(PaymentType.Cash)).toBe("Cash");
    expect(getPaymentTypeLabel(PaymentType.Card)).toBe("Card");
    expect(getPaymentTypeLabel(PaymentType.Transfer)).toBe("Transfer");
    expect(getPaymentTypeLabel(PaymentType.MobilePayment)).toBe("Mobile payment");
    expect(getPaymentTypeLabel(PaymentType.Voucher)).toBe("Voucher");
    expect(getPaymentTypeLabel(PaymentType.Other)).toBe("Other");
  });

  it("uses a caller-supplied localized fallback for an unknown value", () => {
    expect(getPaymentTypeLabel(42, "Unavailable")).toBe("Unavailable");
  });
});
