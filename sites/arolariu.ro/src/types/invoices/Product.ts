/** @format */

import {Allergen} from "./Allergen";

/**
 * Represents the metadata of a product from the invoice domain system.
 */
export type ProductMetadata = {isEdited: boolean; isComplete: boolean; isSoftDeleted: boolean};

/**
 * Represents the category of a product from the invoice domain system.
 */
export enum ProductCategory {
  NOT_DEFINED,
  BAKED_GOODS,
  GROCERIES,
  DAIRY,
  MEAT,
  FISH,
  FRUITS,
  VEGETABLES,
  BEVERAGES,
  ALCOHOLIC_BEVERAGES,
  TOBACCO,
  CLEANING_SUPPLIES,
  PERSONAL_CARE,
  MEDICINE,
  OTHER,
}

/**
 * Represents a product from the invoice domain system.
 */
export default interface Product {
  rawName: string;
  genericName: string;
  category: ProductCategory;
  quantity: number;
  quantityUnit: string;
  productCode: string;
  price: number;
  totalPrice: number;
  detectedAllergens: Allergen[];
  metadata: ProductMetadata;
}
