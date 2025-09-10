import type {NamedEntity} from "../DDD";
import type {PaymentInformation, Product, Recipe} from "./index.ts";

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
export interface Invoice extends NamedEntity<string> {
  /**
   * The user identifier, usually represents the user that created the invoice.
   * It is a GUIDv4 formatted identifier string.
   */
  userIdentifier: string;

  /**
   * The list of users that the invoice is shared with.
   * It is a list of GUIDv4 formatted identifier strings.
   * If the list is empty, the invoice is considered private.
   * If the list contains a special GUIDv4 identifier string, the invoice is considered public.
   */
  sharedWith: string[];

  /**
   * The category of the invoice.
   */
  category: InvoiceCategory;

  /**
   * The URL location of the photo of the invoice.
   * It is a string that represents the URL location of the photo of the invoice.
   */
  photoLocation: string;

  /**
   * The payment information of the invoice.
   */
  paymentInformation: PaymentInformation | null;

  /**
   * The reference identifier of the merchant that issued the invoice.
   * It is a GUIDv4 formatted identifier string.
   */
  merchantReference: string;

  /**
   * The list of items that are present on the invoice.
   */
  items: Product[];

  /**
   * The list of recipes that can be made from the items on the invoice.
   */
  possibleRecipes: Recipe[];

  /**
   * Additional metadata for the invoice.
   */
  additionalMetadata: Record<string, string>;
}

export interface InvoicePayload {
  userIdentifier: string;
  photoIdentifier: string;
  photoLocation: string;
  photoMetadata: Record<string, string>;
}
