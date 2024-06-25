/** @format */

import type NamedEntity from "../DDD/Entities/NamedEntity";
import type Merchant from "./Merchant";
import type {PaymentInformation} from "./Payment";
import type Product from "./Product";
import type {Recipe} from "./Recipe";

/**
 * Represents the options for the invoice analysis.
 */
export type InvoiceAnalysisOptions = {
  completeAnalysis: boolean;
  invoiceOnly: boolean;
  invoiceItemsOnly: boolean;
};

/**
 * Represents the category of an invoice from the invoice domain system.
 */
export enum InvoiceCategory {
  NOT_DEFINED,
  FOOD,
  DRINKS,
  OTHER,
}

/**
 * Represents an invoice (the main entity) from the invoice domain system.
 */
export default interface Invoice extends NamedEntity<string> {
  userIdentifier: string;
  category: InvoiceCategory;
  photoLocation: string;
  paymentInformation: PaymentInformation | null;
  merchant: Merchant | null;
  items: Product[] | null;
  possibleRecipes: Recipe[] | null;
  estimatedSurvivalDays: number | null;
  additionalMetadata: Record<string, object>[];
}

export interface InvoicePayload {
  userIdentifier: string;
  photoIdentifier: string;
  photoLocation: string;
  photoMetadata: [{key: string; value: string}];
}
