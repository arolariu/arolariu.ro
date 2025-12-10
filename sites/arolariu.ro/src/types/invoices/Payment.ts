/**
 * @fileoverview Payment information type definitions for invoice transactions.
 * @module types/invoices/Payment
 *
 * @remarks
 * This module defines payment-related types capturing how invoices are settled.
 * Payment information is critical for financial analytics, reconciliation,
 * and spending categorization.
 *
 * **Currency Handling:**
 * All monetary values use the {@link Currency} type from the DDD shared kernel.
 * Amounts are stored as numbers (decimals) with the currency code.
 *
 * **Tax Calculation:**
 * `totalTaxAmount` is extracted from invoice OCR or calculated from
 * product-level tax information when available.
 *
 * @see {@link Invoice.paymentInformation} for payment attachment
 * @see {@link Currency} for currency value object
 */

import type {Currency} from "../DDD";

/**
 * Enumerates the supported payment method types.
 *
 * @remarks
 * Identifies how a transaction was settled. Payment type is extracted
 * from invoice text during AI analysis or manually specified by users.
 *
 * **Numeric Values:**
 * Values are spaced by 100 to allow future payment type additions.
 * `Unknown` (0) is the default for invoices with unidentified payment methods.
 *
 * **Common Mappings:**
 * - `Cash`: Physical currency payment
 * - `Card`: Credit/debit card (Visa, Mastercard, etc.)
 * - `Transfer`: Bank wire or IBAN transfer
 * - `MobilePayment`: Apple Pay, Google Pay, Revolut, etc.
 * - `Voucher`: Gift cards, meal vouchers, discount coupons
 *
 * @example
 * ```typescript
 * const paymentInfo: PaymentInformation = {
 *   paymentType: PaymentType.Card,
 *   // ... other properties
 * };
 *
 * // Analytics by payment method
 * const cardPayments = invoices.filter(i =>
 *   i.paymentInformation.paymentType === PaymentType.Card
 * );
 * ```
 *
 * @see {@link PaymentInformation} for complete payment details
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
 * Captures the financial details of an invoice transaction.
 *
 * @remarks
 * **Domain Concept:**
 * Payment information encapsulates all monetary aspects of an invoice
 * including timing, method, amounts, and currency. This is a value object
 * embedded within the Invoice aggregate.
 *
 * **Invariants:**
 * - `totalCostAmount` must be non-negative
 * - `totalTaxAmount` must not exceed `totalCostAmount`
 * - `totalCostAmount` should equal sum of product totals (within rounding tolerance)
 *
 * **Date Handling:**
 * `transactionDate` is extracted from invoice OCR or defaults to upload time.
 * It represents when the transaction occurred, not when the invoice was created.
 *
 * **Currency Consistency:**
 * All products on an invoice must use the same currency as the payment.
 * Multi-currency invoices are not currently supported.
 *
 * @example
 * ```typescript
 * const paymentInfo: PaymentInformation = {
 *   transactionDate: new Date("2024-03-15T14:30:00Z"),
 *   paymentType: PaymentType.Card,
 *   currency: { code: "RON", symbol: "lei", name: "Romanian Leu" },
 *   totalCostAmount: 157.50,
 *   totalTaxAmount: 25.12
 * };
 *
 * // Calculate net amount
 * const netAmount = paymentInfo.totalCostAmount - paymentInfo.totalTaxAmount;
 * ```
 *
 * @see {@link Invoice.paymentInformation} for invoice attachment
 * @see {@link PaymentType} for payment method options
 * @see {@link Currency} for currency structure
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

/**
 * DTO payload for creating payment information.
 *
 * @remarks
 * **Partial Fields:**
 * All fields are optional as payment details may be incrementally
 * extracted during AI analysis. Required fields are validated
 * before invoice submission.
 *
 * **Auto-population:**
 * When not provided:
 * - `transactionDate`: Defaults to current timestamp
 * - `paymentType`: Defaults to `Unknown`
 * - `totalTaxAmount`: Calculated from product tax data if available
 *
 * @example
 * ```typescript
 * const payload: CreatePaymentInformationDtoPayload = {
 *   paymentType: PaymentType.Cash,
 *   totalCostAmount: 45.99
 * };
 * ```
 *
 * @see {@link PaymentInformation} for the entity structure
 */
export type CreatePaymentInformationDtoPayload = Partial<PaymentInformation>;

/**
 * DTO payload for updating existing payment information.
 *
 * @remarks
 * **Partial Updates:**
 * Only provided fields are updated. Payment info is embedded in
 * the invoice, so updates go through the invoice update endpoint.
 *
 * **Validation:**
 * After update, invariants are re-validated:
 * - `totalCostAmount` >= `totalTaxAmount`
 * - Amounts are non-negative
 *
 * @example
 * ```typescript
 * const updatePayload: UpdatePaymentInformationDtoPayload = {
 *   totalCostAmount: 167.50,  // Corrected amount
 *   totalTaxAmount: 26.80
 * };
 * ```
 *
 * @see {@link PaymentInformation} for the entity structure
 */
export type UpdatePaymentInformationDtoPayload = Partial<PaymentInformation>;

/**
 * DTO payload for resetting payment information to defaults.
 *
 * @remarks
 * **Note:** Payment information cannot be truly "deleted" as it's
 * embedded in the invoice. This DTO identifies which payment record
 * to reset to default/empty values.
 *
 * **Identification:**
 * Uses composite key of `transactionDate` + `paymentType` since
 * payment info doesn't have a separate identifier.
 *
 * @example
 * ```typescript
 * const deletePayload: DeletePaymentInformationDtoPayload = {
 *   transactionDate: new Date("2024-03-15"),
 *   paymentType: PaymentType.Card
 * };
 * ```
 *
 * @see {@link PaymentInformation} for the entity structure
 */
export type DeletePaymentInformationDtoPayload = {
  /** The date when the payment was made. */
  readonly transactionDate: Date;

  /** The type of payment used. */
  readonly paymentType: PaymentType;
};
