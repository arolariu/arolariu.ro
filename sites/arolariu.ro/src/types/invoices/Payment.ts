/**
 * Represents the payment information of an invoice from the invoice domain system.
 *
 * @format
 */

import type {Currency} from "../DDD/SharedKernel/Currency";

export type PaymentInformation = {
  dateOfPurchase: Date;
  currency: Currency;
  totalAmount: number;
  totalTax: number;
};
