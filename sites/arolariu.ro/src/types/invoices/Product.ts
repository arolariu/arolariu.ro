/** @format */

/**
 * Represents a product from the invoice domain system.
 */
export default interface Product {
  rawName: string;
  genericName: string;
  category: ItemCategory;
  quantity: number;
  quantityUnit: string;
  productCode: string;
  price: number;
  totalPrice: number;
  detectedAllergens: Allergen[];
  metadata: ProductMetadata;
}

/**
 * Represents the category of a product from the invoice domain system.
 */
export enum ItemCategory {
  NOT_DEFINED = 0,
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
 * Represents an allergen from the invoice domain system.
 */
export type Allergen = {name: string};

/**
 * Represents the metadata of a product from the invoice domain system.
 */
export type ProductMetadata = {isEdited: boolean; isComplete: boolean; isSoftDeleted: boolean};
