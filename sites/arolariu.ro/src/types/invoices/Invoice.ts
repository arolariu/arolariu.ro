import type {NamedEntity} from "../DDD";
import type {PaymentInformation, Product, Recipe} from "./index.ts";

/**
 * Represents the options for the invoice analysis.
 */
export enum InvoiceAnalysisOptions {
  /** No analysis will be performed on the invoice. */
  NoAnalysis,
  /** Full analysis will be performed on the invoice. */
  CompleteAnalysis,
  /** Only the invoice data will be analyzed. */
  InvoiceOnly,
  /** Only the items on the invoice will be analyzed. */
  InvoiceItemsOnly,
  /** Only the merchant information will be analyzed. */
  InvoiceMerchantOnly,
}

/**
 * Represents the scan type of an invoice scan object.
 */
export enum InvoiceScanType {
  /** JPEG image format */
  JPG,
  /** JPEG image format */
  JPEG,
  /** PNG image format */
  PNG,
  /** PDF document format */
  PDF,
  /**  Other image format */
  OTHER,
  /** Unknown or unsupported format */
  UNKNOWN,
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

type SpecialMetadataKeys = "isImportant" | "requiresAnalysis";

/**
 * Represents the data transfer object payload for creating an invoice.
 */
export type CreateInvoiceDtoPayload = {
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
  /** The metadata associated with the invoice. */
  // eslint-disable-next-line sonarjs/no-useless-intersection -- we want to allow extensibility.
  readonly metadata: Record<SpecialMetadataKeys | (string & {}), string>;
};

/** Represents the data transfer object payload for updating an invoice. */
export type UpdateInvoiceDtoPayload<T = string> = {
  /** The unique identifier of the invoice. */
  readonly id: T;
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
} & Partial<Omit<Invoice, "id" | "userIdentifier">>;

/** Represents the data transfer object payload for deleting an invoice. */
export type DeleteInvoiceDtoPayload<T = string> = {
  /** The unique identifier of the invoice to be deleted. */
  readonly id: T;
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
};

/** Represents the data transfer object payload for creating an invoice scan. */
export type CreateInvoiceScanDtoPayload = {
  /** The type of the invoice scan. */
  readonly type: InvoiceScanType;
  /** The location (URL or path) of the invoice scan. */
  readonly location: string;
  /** Additional metadata associated with the invoice scan. */
  readonly additionalMetadata: Record<string, string>;
};

/** Represents the data transfer object payload for deleting an invoice scan. */
export type DeleteInvoiceScanDtoPayload = {
  /** The unique identifier of the invoice scan to be deleted. */
  readonly id: string;
};
