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
   * Sets the raw product name as it appears on the receipt.
   * @param rawName Unprocessed name from receipt
   * @returns The ProductBuilder instance for chaining
   */
  withRawName(rawName: string): this {
    this.product.rawName = rawName;
    return this;
  }

  /**
   * Sets the normalized/cleaned generic product name.
   * @param genericName Standardized product name
   * @returns The ProductBuilder instance for chaining
   */
  withGenericName(genericName: string): this {
    this.product.genericName = genericName;
    return this;
  }

  /**
   * Sets the product code or barcode identifier.
   * @param code SKU, EAN, or UPC code
   * @returns The ProductBuilder instance for chaining
   */
  withProductCode(code: string): this {
    this.product.productCode = code;
    return this;
  }

  /**
   * Sets the product category classification.
   * @param category Type or class of product
   * @returns The ProductBuilder instance for chaining
   */
  withCategory(category: ProductCategory): this {
    this.product.category = category;
    return this;
  }

  /**
   * Sets the unit price and recalculates total price.
   * @param price Price per unit
   * @returns The ProductBuilder instance for chaining
   */
  withPrice(price: number): this {
    this.product.price = price;
    this.product.totalPrice = price * this.product.quantity;
    return this;
  }

  /**
   * Sets the quantity and recalculates total price.
   * @param quantity Number of units purchased
   * @returns The ProductBuilder instance for chaining
   */
  withQuantity(quantity: number): this {
    this.product.quantity = quantity;
    this.product.totalPrice = this.product.price * quantity;
    return this;
  }

  /**
   * Sets the measurement unit for quantity.
   * @param unit Measurement unit (e.g., kg, pcs, l)
   * @returns The ProductBuilder instance for chaining
   */
  withQuantityUnit(unit: string): this {
    this.product.quantityUnit = unit;
    return this;
  }

  /**
   * Overrides the total price without recalculating.
   * @param totalPrice Final price to set directly
   * @returns The ProductBuilder instance for chaining
   */
  withTotalPrice(totalPrice: number): this {
    this.product.totalPrice = totalPrice;
    return this;
  }

  /**
   * Sets the list of detected allergens for this product.
   * @param allergens Array of allergen identifiers
   * @returns The ProductBuilder instance for chaining
   */
  withDetectedAllergens(allergens: Allergen[]): this {
    this.product.detectedAllergens = allergens;
    return this;
  }

  /**
   * Generates random allergens for testing purposes.
   * @param count Number of allergens to generate (defaults to 0-3)
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
   * Sets custom metadata flags for the product.
   * @param metadata Flags for completion, edit status, and soft deletion
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
   * Constructs the final product object from builder state.
   * @returns The constructed {@link Product} object
   */
  build(): Product {
    return {...this.product};
  }

  /**
   * Creates multiple product instances with unique identifiers.
   * @param count How many products to create
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
 * Creates a new product builder instance for fluent configuration.
 * @returns A new instance of {@link ProductBuilder}
 */
export function createProductBuilder(): ProductBuilder {
  return new ProductBuilder();
}

/**
 * Generates a complete random product for testing purposes.
 * @returns A randomly generated {@link Product} object
 */
export function generateRandomProduct(): Product {
  return new ProductBuilder().withRandomAllergens().build();
}

/**
 * Generates multiple random products for testing purposes.
 * @param count How many products to generate
 * @returns An array of randomly generated {@link Product} objects
 */
export function generateRandomProducts(count: number): Product[] {
  return Array.from({length: count}, generateRandomProduct);
}

// Pre-built mock instances for quick testing
export const mockProduct = new ProductBuilder().withGenericName("Test Product").withPrice(9.99).withQuantity(2).build();

export const mockProductList = generateRandomProducts(10);
