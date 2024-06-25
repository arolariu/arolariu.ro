/**
 * Represents the payment information of an invoice from the invoice domain system.
 *
 * @format
 */

import type {Currency} from "../DDD/SharedKernel/Currency";

export type PaymentInformation = {
  dateOfPurchase: Date | null;
  currency: Currency | null;
  totalAmount: number | null;
  totalTax: number | null;
};
