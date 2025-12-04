/**
 * @fileoverview Product mock builder for testing and development.
 * @module data/mocks/product
 *
 * @remarks
 * Provides fluent builder pattern for creating realistic product/item test data.
 *
 * **Key Features:**
 * - Fluent API for product configuration
 * - Faker.js integration for realistic product data
 * - Category-based product classification
 * - Support for pricing, quantities, and allergen tracking
 * - Metadata for product state (completion, editing, deletion)
 * - Batch generation with unique properties
 *
 * @see {@link ProductBuilder} - Main builder class
 * @see {@link generateRandomProduct} - Quick random generation
 */

import {type Allergen, type Product, type ProductCategory} from "@/types/invoices";
import {faker} from "@faker-js/faker";

/**
 * Fluent builder for creating mock Product objects with customizable properties.
 *
 * @remarks
 * **Design Pattern**: Implements the Builder pattern for flexible object construction.
 *
 * **Default Initialization:**
 * - Random product names from faker.commerce
 * - Random prices between $0.50 and $100.00
 * - Random quantities (1-10 units)
 * - Random product codes (8-character alphanumeric)
 * - Random categories (0-13 range)
 * - Random quantity units (kg, g, l, ml, pcs, unit)
 * - Calculated totalPrice (price × quantity)
 * - Empty allergen arrays by default
 * - Incomplete, unedited, non-deleted metadata state
 *
 * **Method Chaining:**
 * All `with*()` methods return `this` for fluent API usage.
 *
 * **Batch Building:**
 * Use `buildMany()` to create multiple products with unique properties.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const product = new ProductBuilder()
 *   .withRawName("Organic Bananas")
 *   .withCategory(ProductCategory.FOOD)
 *   .withPrice(2.99)
 *   .withQuantity(5)
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * // With allergens
 * const product = new ProductBuilder()
 *   .withGenericName("Peanut Butter")
 *   .withDetectedAllergens([Allergen.PEANUTS, Allergen.TREE_NUTS])
 *   .build();
 * ```
 */
export class ProductBuilder {
  private product: Product;

  /**
   * Creates a new ProductBuilder with default random values.
   *
   * @remarks
   * **Initialization Strategy:**
   * - Generates random product names using faker.commerce
   * - Creates random prices between $0.50 and $100.00 (2 decimal places)
   * - Sets random quantities (1-10 units)
   * - Generates 8-character alphanumeric product codes
   * - Assigns random categories (0-13 enum range)
   * - Selects random quantity units (kg, g, l, ml, pcs, unit)
   * - Auto-calculates totalPrice (price × quantity)
   * - Initializes empty allergen arrays
   * - Sets metadata to incomplete, unedited, not deleted
   *
   * @example
   * ```typescript
   * const builder = new ProductBuilder();
   * const product = builder.build();
   * // Result: Product with random but realistic data
   * ```
   */
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
   *
   * @param rawName - Unprocessed name from OCR/receipt text
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * Raw names may contain typos, formatting issues, or extra characters from OCR.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withRawName("ORG BANANAS 1KG")
   *   .withGenericName("Organic Bananas")
   *   .build();
   * ```
   */
  withRawName(rawName: string): this {
    this.product.rawName = rawName;
    return this;
  }

  /**
   * Sets the normalized/cleaned generic product name.
   *
   * @param genericName - Standardized, human-readable product name
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * Generic names should be cleaned and normalized for display and searching.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withGenericName("Organic Milk 2%")
   *   .build();
   * ```
   */
  withGenericName(genericName: string): this {
    this.product.genericName = genericName;
    return this;
  }

  /**
   * Sets the product code or barcode identifier.
   *
   * @param code - SKU, EAN, UPC, or other product identifier
   * @returns The ProductBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withProductCode("1234567890123") // EAN-13 barcode
   *   .build();
   * ```
   */
  withProductCode(code: string): this {
    this.product.productCode = code;
    return this;
  }

  /**
   * Sets the product category classification.
   *
   * @param category - ProductCategory enum value
   * @returns The ProductBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withCategory(ProductCategory.FOOD)
   *   .build();
   * ```
   *
   * @see {@link ProductCategory} for available categories
   */
  withCategory(category: ProductCategory): this {
    this.product.category = category;
    return this;
  }

  /**
   * Sets the unit price and recalculates total price.
   *
   * @param price - Price per unit (must be non-negative)
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * **Side Effect:** Automatically recalculates `totalPrice = price × quantity`.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withPrice(2.99)
   *   .withQuantity(3)
   *   .build();
   * // totalPrice = 8.97
   * ```
   */
  withPrice(price: number): this {
    this.product.price = price;
    this.product.totalPrice = price * this.product.quantity;
    return this;
  }

  /**
   * Sets the quantity and recalculates total price.
   *
   * @param quantity - Number of units purchased (must be positive)
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * **Side Effect:** Automatically recalculates `totalPrice = price × quantity`.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withPrice(1.50)
   *   .withQuantity(10)
   *   .build();
   * // totalPrice = 15.00
   * ```
   */
  withQuantity(quantity: number): this {
    this.product.quantity = quantity;
    this.product.totalPrice = this.product.price * quantity;
    return this;
  }

  /**
   * Sets the measurement unit for quantity.
   *
   * @param unit - Measurement unit (e.g., "kg", "pcs", "l", "ml")
   * @returns The ProductBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withQuantity(2.5)
   *   .withQuantityUnit("kg")
   *   .build();
   * ```
   */
  withQuantityUnit(unit: string): this {
    this.product.quantityUnit = unit;
    return this;
  }

  /**
   * Overrides the total price without automatic recalculation.
   *
   * @param totalPrice - Final price to set directly
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * **Use Case:** When the total price includes discounts or doesn't equal price × quantity.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withPrice(10)
   *   .withQuantity(3)
   *   .withTotalPrice(25) // Discounted from 30
   *   .build();
   * ```
   */
  withTotalPrice(totalPrice: number): this {
    this.product.totalPrice = totalPrice;
    return this;
  }

  /**
   * Sets the list of detected allergens for this product.
   *
   * @param allergens - Array of Allergen enum values
   * @returns The ProductBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withGenericName("Peanut Butter")
   *   .withDetectedAllergens([Allergen.PEANUTS, Allergen.TREE_NUTS])
   *   .build();
   * ```
   *
   * @see {@link Allergen} for available allergen types
   */
  withDetectedAllergens(allergens: Allergen[]): this {
    this.product.detectedAllergens = allergens;
    return this;
  }

  /**
   * Generates random allergens for testing purposes.
   *
   * @param count - Number of allergens to generate (defaults to random 0-3)
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * Randomly selects from common allergen names including gluten, nuts, dairy, eggs, etc.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withRandomAllergens(2) // Exactly 2 allergens
   *   .build();
   * ```
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
   *
   * @param metadata - Flags for completion, edit status, and soft deletion
   * @returns The ProductBuilder instance for method chaining
   *
   * @remarks
   * **Metadata Properties:**
   * - `isComplete`: Product information is fully populated
   * - `isEdited`: Product has been manually modified by user
   * - `isSoftDeleted`: Product is marked for deletion but not removed
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withMetadata({
   *     isComplete: true,
   *     isEdited: false,
   *     isSoftDeleted: false
   *   })
   *   .build();
   * ```
   */
  withMetadata(metadata: {isComplete?: boolean; isEdited?: boolean; isSoftDeleted?: boolean}): this {
    this.product.metadata = {
      ...this.product.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * Builds and returns the configured Product object.
   *
   * @returns A new Product object with all configured properties
   *
   * @remarks
   * Creates a shallow copy of the internal product object to prevent mutations.
   *
   * @example
   * ```typescript
   * const product = new ProductBuilder()
   *   .withGenericName("Apple Juice")
   *   .withCategory(ProductCategory.BEVERAGES)
   *   .build();
   * ```
   */
  build(): Product {
    return {...this.product};
  }

  /**
   * Builds multiple Product objects with unique properties.
   *
   * @param count - Number of product objects to generate
   * @returns Array of Product objects with randomized names and codes
   *
   * @remarks
   * Each generated product has unique rawName, genericName, and productCode.
   * All other properties remain consistent from the builder configuration.
   *
   * @example
   * ```typescript
   * const products = new ProductBuilder()
   *   .withCategory(ProductCategory.FOOD)
   *   .withPrice(5.99)
   *   .buildMany(15); // 15 food products at $5.99 each
   * ```
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
 * Factory function that creates a new ProductBuilder instance.
 *
 * @returns A new ProductBuilder with default random values
 *
 * @remarks
 * Convenience function providing a more functional programming style than `new ProductBuilder()`.
 *
 * @example
 * ```typescript
 * const product = createProductBuilder()
 *   .withGenericName("Chocolate Bar")
 *   .build();
 * ```
 */
export function createProductBuilder(): ProductBuilder {
  return new ProductBuilder();
}

/**
 * Generates a single random Product with realistic data and allergens.
 *
 * @returns A randomly configured Product object with random allergens
 *
 * @remarks
 * **Use Cases:**
 * - Quick test data generation
 * - Seeding development databases
 * - Populating UI prototypes
 *
 * **Randomization:**
 * - All properties use faker.js for realistic values
 * - Random allergens (0-3) are automatically added
 * - Prices, quantities, and categories are randomized
 *
 * @example
 * ```typescript
 * const product = generateRandomProduct();
 * // Result: {
 * //   rawName: "Ergonomic Frozen Hat",
 * //   genericName: "Tasty Steel Chips",
 * //   productCode: "ABC12345",
 * //   category: ProductCategory.FOOD,
 * //   price: 12.34,
 * //   quantity: 3,
 * //   detectedAllergens: [{name: "gluten", ...}],
 * //   ...
 * // }
 * ```
 *
 * @see {@link generateRandomProducts} for batch generation
 */
export function generateRandomProduct(): Product {
  return new ProductBuilder().withRandomAllergens().build();
}

/**
 * Generates multiple random Products with realistic data.
 *
 * @param count - Number of products to generate
 * @returns Array of randomly configured Product objects
 *
 * @remarks
 * Each product is independently randomized with unique properties and allergens.
 *
 * **Performance:**
 * - Efficient for large datasets (uses array generation)
 * - Each product has distinct faker-generated values
 *
 * @example
 * ```typescript
 * const products = generateRandomProducts(100);
 * // Returns 100 unique products with random data
 * ```
 *
 * @example
 * ```typescript
 * // Seed invoice with random products
 * const items = generateRandomProducts(25);
 * const invoice = new InvoiceBuilder()
 *   .withItems(items)
 *   .build();
 * ```
 *
 * @see {@link generateRandomProduct} for single product generation
 */
export function generateRandomProducts(count: number): Product[] {
  return Array.from({length: count}, generateRandomProduct);
}

/**
 * Pre-built mock product for consistent testing.
 *
 * @remarks
 * **Use Case:** Use when you need a deterministic product across test cases.
 *
 * **Characteristics:**
 * - Name: "Test Product"
 * - Price: $9.99
 * - Quantity: 2 units
 * - Total: $19.98
 * - Other properties are faker-generated but deterministic
 *
 * @example
 * ```typescript
 * import {mockProduct} from "@/data/mocks";
 *
 * it("should calculate tax correctly", () => {
 *   const tax = calculateTax(mockProduct.totalPrice);
 *   expect(tax).toBeCloseTo(1.99, 2);
 * });
 * ```
 */
export const mockProduct = new ProductBuilder().withGenericName("Test Product").withPrice(9.99).withQuantity(2).build();

/**
 * Pre-built list of 10 mock products for testing collections.
 *
 * @remarks
 * **Use Case:** Use when testing list rendering, filtering, or batch operations.
 *
 * **Characteristics:**
 * - Contains 10 distinct products
 * - Each with unique randomized properties and allergens
 * - Fixed for a given execution (deterministic)
 *
 * @example
 * ```typescript
 * import {mockProductList} from "@/data/mocks";
 *
 * it("should render product list", () => {
 *   render(<ProductList products={mockProductList} />);
 *   expect(screen.getAllByRole("listitem")).toHaveLength(10);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Test filtering by category
 * const foodProducts = mockProductList.filter(
 *   p => p.category === ProductCategory.FOOD
 * );
 * ```
 */
export const mockProductList = generateRandomProducts(10);
