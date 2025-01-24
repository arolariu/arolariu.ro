/** @format */

import type NamedEntity from "../DDD/Entities/NamedEntity";
import type Merchant from "./Merchant";
import type {PaymentInformation} from "./Payment";
import type Product from "./Product";
import type {Recipe} from "./Recipe";

/**
 * Represents the options for the invoice analysis.
 */
export enum InvoiceAnalysisOptions {
  NoAnalysis,
  CompleteAnalysis,
  InvoiceOnly,
  InvoiceItemsOnly,
  InvoiceMerchantOnly,
}
/**
 * Represents the category of an invoice from the invoice domain system.
 */
export enum InvoiceCategory {
  NOT_DEFINED = 0,
  GROCERY = 100,
  FAST_FOOD = 200,
  HOME_CLEANING = 300,
  CAR_AUTO = 400,
  OTHER = 9999,
}

/**
 * Represents an invoice (the main entity) from the invoice domain system.
 */
export default interface Invoice extends NamedEntity<string> {
  userIdentifier: string;
  sharedWith: string[];
  category: InvoiceCategory;
  photoLocation: string;
  paymentInformation: PaymentInformation | null;
  merchant: Merchant | null;
  items: Product[];
  possibleRecipes: Recipe[];
  additionalMetadata: Record<string, string>;
}

export interface InvoicePayload {
  userIdentifier: string;
  photoIdentifier: string;
  photoLocation: string;
  photoMetadata: Record<string, string>;
}
