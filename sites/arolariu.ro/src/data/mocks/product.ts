/**
 * @fileoverview Product mock builder for testing
 * @module data/mocks/product
 */

import {type Allergen, type Product, type ProductCategory} from "@/types/invoices";
import {faker} from "@faker-js/faker";

/**
 * Builder class for creating mock Product objects with fluent API
 * @example
 * ```typescript
 * const product = new ProductBuilder()
 *   .withGenericName("Milk")
 *   .withPrice(3.99)
 *   .withQuantity(2)
 *   .build();
 * ```
 */
export class ProductBuilder {
  private product: Product;

  constructor() {
    const price = faker.number.float({min: 0.5, max: 100, multipleOf: 0.01});
    const quantity = faker.number.int({min: 1, max: 10});

    this.product = {
      rawName: faker.commerce.productName(),
      genericName: faker.commerce.productName(),
      productCode: faker.string.alphanumeric(8).toUpperCase(),
      category: faker.number.int({min: 0, max: 13}) as ProductCategory,
      price,
      quantity,
      quantityUnit: faker.helpers.arrayElement(["kg", "g", "l", "ml", "pcs", "unit"]),
      totalPrice: price * quantity,
      detectedAllergens: [],
      metadata: {
        isComplete: false,
        isEdited: false,
        isSoftDeleted: false,
      },
    };
  }

  /**
   * Set the raw name (as it appears on the receipt)
   * @param rawName The raw product name
   * @returns The ProductBuilder instance for chaining
   */
  withRawName(rawName: string): this {
    this.product.rawName = rawName;
    return this;
  }

  /**
   * Set the generic name (normalized/cleaned name)
   * @param genericName The generic product name
   * @returns The ProductBuilder instance for chaining
   */
  withGenericName(genericName: string): this {
    this.product.genericName = genericName;
    return this;
  }

  /**
   * Set the product code/barcode
   * @param code The product code
   * @returns The ProductBuilder instance for chaining
   */
  withProductCode(code: string): this {
    this.product.productCode = code;
    return this;
  }

  /**
   * Set the product category
   * @param category The product category
   * @returns The ProductBuilder instance for chaining
   */
  withCategory(category: ProductCategory): this {
    this.product.category = category;
    return this;
  }

  /**
   * Set the unit price
   * @param price The unit price
   * @returns The ProductBuilder instance for chaining
   */
  withPrice(price: number): this {
    this.product.price = price;
    this.product.totalPrice = price * this.product.quantity;
    return this;
  }

  /**
   * Set the quantity
   * @param quantity The product quantity
   * @returns The ProductBuilder instance for chaining
   */
  withQuantity(quantity: number): this {
    this.product.quantity = quantity;
    this.product.totalPrice = this.product.price * quantity;
    return this;
  }

  /**
   * Set the quantity unit
   * @param unit The quantity unit
   * @returns The ProductBuilder instance for chaining
   */
  withQuantityUnit(unit: string): this {
    this.product.quantityUnit = unit;
    return this;
  }

  /**
   * Set the total price directly (overrides calculated value)
   * @param totalPrice The total price
   * @returns The ProductBuilder instance for chaining
   */
  withTotalPrice(totalPrice: number): this {
    this.product.totalPrice = totalPrice;
    return this;
  }

  /**
   * Set detected allergens
   * @param allergens The detected allergens
   * @returns The ProductBuilder instance for chaining
   */
  withDetectedAllergens(allergens: Allergen[]): this {
    this.product.detectedAllergens = allergens;
    return this;
  }

  /**
   * Add random allergens to the product
   * @param count Optional number of allergens to add
   * @returns The ProductBuilder instance for chaining
   */
  withRandomAllergens(count?: number): this {
    const allergenNames = [
      "gluten",
      "crustaceans",
      "eggs",
      "fish",
      "peanuts",
      "soybeans",
      "milk",
      "nuts",
      "celery",
      "mustard",
      "sesame seeds",
      "sulphur dioxide",
      "lupin",
      "molluscs",
    ];

    const allergenCount = count ?? faker.number.int({min: 0, max: 3});
    const selectedAllergenNames = faker.helpers.arrayElements(allergenNames, allergenCount);
    this.product.detectedAllergens = selectedAllergenNames.map((allergenName) => ({
      name: allergenName,
      description: faker.lorem.sentence(),
      learnMoreAddress: faker.internet.url(),
    }));
    return this;
  }

  /**
   * Set product metadata
   * @param metadata The product metadata
   * @returns The ProductBuilder instance for chaining
   */
  withMetadata(metadata: {isComplete?: boolean; isEdited?: boolean; isSoftDeleted?: boolean}): this {
    this.product.metadata = {
      ...this.product.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * Build and return the product object
   * @returns The constructed {@link Product} object
   */
  build(): Product {
    return {...this.product};
  }

  /**
   * Create multiple products with the same configuration
   * @param count The number of products to create
   * @returns An array of constructed {@link Product} objects
   */
  buildMany(count: number): Product[] {
    return Array.from({length: count}, () => {
      // Generate new unique identifiers for each instance
      const product = this.build();
      product.productCode = faker.string.alphanumeric(8).toUpperCase();
      product.rawName = `${product.rawName} ${faker.string.nanoid(5)}`;
      return product;
    });
  }
}

/**
 * Factory function to create a new ProductBuilder
 * @returns A new instance of {@link ProductBuilder}
 */
export function createProductBuilder(): ProductBuilder {
  return new ProductBuilder();
}

/**
 * Generate a single random product
 * @returns A randomly generated {@link Product} object
 */
export function generateRandomProduct(): Product {
  return new ProductBuilder().withRandomAllergens().build();
}

/**
 * Generate multiple random products
 * @param count The number of products to generate
 * @returns An array of randomly generated {@link Product} objects
 */
export function generateRandomProducts(count: number): Product[] {
  return Array.from({length: count}, generateRandomProduct);
}

// Pre-built mock instances for quick testing
export const mockProduct = new ProductBuilder().withGenericName("Test Product").withPrice(9.99).withQuantity(2).build();

export const mockProductList = generateRandomProducts(10);
