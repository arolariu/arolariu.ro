/**
 * Represents the payment information of an invoice from the invoice domain system.
 *
 * @format
 */

export enum PaymentType {
  Unknown,
  Cash,
  Card,
  Transfer,
  MobilePayment,
  Voucher,
  Other,
}

export type PaymentInformation = {
  dateOfPurchase: Date;
  paymentType: PaymentType;
  currencyName: string;
  currencySymbol: string;
  totalAmount: number;
  totalTax: number;
};
