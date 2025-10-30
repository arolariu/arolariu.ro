import type {Allergen} from "./index.ts";

/**
 * Represents the metadata of a product from the invoice domain system.
 */
export type ProductMetadata = {isEdited: boolean; isComplete: boolean; isSoftDeleted: boolean};

/**
 * Represents the category of a product from the invoice domain system.
 */
export enum ProductCategory {
  NOT_DEFINED = 0,
  BAKED_GOODS = 100,
  GROCERIES = 200,
  DAIRY = 300,
  MEAT = 400,
  FISH = 500,
  FRUITS = 600,
  VEGETABLES = 700,
  BEVERAGES = 800,
  ALCOHOLIC_BEVERAGES = 900,
  TOBACCO = 1000,
  CLEANING_SUPPLIES = 1100,
  PERSONAL_CARE = 1200,
  MEDICINE = 1300,
  OTHER = 9999,
}

/**
 * Represents a product from the invoice domain system.
 */
export interface Product {
  /** The raw name of the product. */
  rawName: string;

  /** The generic name of the product. */
  genericName: string;

  /** The category of the product. */
  category: ProductCategory;

  /** The quantity of the product. */
  quantity: number;

  /** The unit of measurement for the product quantity. */
  quantityUnit: string;

  /** The product code (e.g., barcode) of the product. */
  productCode: string;

  /** The unit price of the product. */
  price: number;

  /** The total price of the product (price * quantity). */
  totalPrice: number;

  /** The list of detected allergens in the product. */
  detectedAllergens: Allergen[];

  /** The metadata associated with the product. */
  metadata: ProductMetadata;
}

export type CreateProductDtoPayload = Partial<Product>;
export type UpdateProductDtoPayload = Partial<Product>;
export type DeleteProductDtoPayload = {rawName: string} | {productCode: string};
