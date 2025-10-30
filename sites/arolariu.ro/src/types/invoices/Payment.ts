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
  /** The date when the payment was made. */
  transactionDate: Date;

  /** The type of payment used. */
  paymentType: PaymentType;

  /** The currency used for the payment. */
  currency: Currency;

  /** The total cost amount of the payment. */
  totalCostAmount: number;

  /** The total tax amount of the payment. */
  totalTaxAmount: number;
};

/** Represents the data transfer object payload for creating payment information. */
export type CreatePaymentInformationDtoPayload = Partial<PaymentInformation>;

/** Represents the data transfer object payload for updating payment information. */
export type UpdatePaymentInformationDtoPayload = Partial<PaymentInformation>;

/** Represents the data transfer object payload for deleting payment information. */
export type DeletePaymentInformationDtoPayload = {
  /** The date when the payment was made. */
  transactionDate: Date;

  /** The type of payment used. */
  paymentType: PaymentType;
};
