/**
 * @fileoverview Unit tests for invoice domain label utilities.
 * @module app/domains/invoices/_utils/labelUtilities/tests
 */

import {PaymentType} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {getPaymentTypeLabel} from "./labelUtilities";

describe("invoice label utilities", () => {
  describe("getPaymentTypeLabel", () => {
    it("returns payment type labels", () => {
      expect(getPaymentTypeLabel(PaymentType.Unknown)).toBe("Unknown");
      expect(getPaymentTypeLabel(PaymentType.Cash)).toBe("Cash");
      expect(getPaymentTypeLabel(PaymentType.Card)).toBe("Card");
      expect(getPaymentTypeLabel(PaymentType.Transfer)).toBe("Transfer");
      expect(getPaymentTypeLabel(PaymentType.MobilePayment)).toBe("Mobile Payment");
      expect(getPaymentTypeLabel(PaymentType.Voucher)).toBe("Voucher");
      expect(getPaymentTypeLabel(PaymentType.Other)).toBe("Other");
    });

    it("returns Unknown for unsupported payment types", () => {
      expect(getPaymentTypeLabel(42)).toBe("Unknown");
    });
  });
});
