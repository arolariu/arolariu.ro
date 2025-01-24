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
