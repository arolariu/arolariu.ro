import type {Currency} from "../DDD";

/**
 * Enum representing the different types of payments.
 */
export enum PaymentType {
  Unknown = 0,
  Cash = 100,
  Card = 200,
  Transfer = 300,
  MobilePayment = 400,
  Voucher = 500,
  Other = 9999,
}

/**
 * Represents the payment information of an invoice from the invoice domain system.
 */
export type PaymentInformation = {
  transactionDate: Date;
  paymentType: PaymentType;
  currency: Currency;
  totalCostAmount: number;
  totalTaxAmount: number;
};
