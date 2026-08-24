/**
 * @fileoverview Mock invoice data for statistics chart Storybook stories.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/__mocks__/mockInvoices
 *
 * @remarks
 * Provides realistic mock invoice data for testing and demonstrating
 * statistics charts in Storybook. Data includes diverse:
 * - Currencies (RON, EUR, USD)
 * - Standard taxonomy classifications (ECOICOP v2, GS1 GPC)
 * - Merchants
 * - Date ranges (past 6 months)
 * - Allergens
 * - Transaction amounts
 */

import {InvoiceScanType, type Invoice, type InvoiceScan, type PaymentInformation, type Product} from "@/types/invoices";
import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices/Classification";

// ---------------------------------------------------------------------------
// Classification factory
// ---------------------------------------------------------------------------

/**
 * Builds a {@link StandardClassification} for use in mock data.
 *
 * @param system - The taxonomy system (ECOICOP_V2, GS1_GPC, NACE_2_1).
 * @param code - The leaf code; must equal the last hierarchy node's code.
 * @param hierarchy - Ordered root-to-leaf triplets of [level, code, officialLabel].
 *   The last entry's code MUST equal `code` (domain invariant).
 */
function makeClassification(
  system: ClassificationSystem,
  code: string,
  hierarchy: ReadonlyArray<readonly [level: string, code: string, officialLabel: string]>,
): StandardClassification {
  let version = "2026-05";
  if (system === ClassificationSystem.EcoicopV2) {
    version = "2";
  } else if (system === ClassificationSystem.Nace21) {
    version = "2.1";
  }
  return {
    system,
    code,
    officialLabel: hierarchy.at(-1)?.[2] ?? code,
    version,
    hierarchy: hierarchy.map(([level, nodeCode, officialLabel]) => ({level, code: nodeCode, officialLabel})),
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

// ---------------------------------------------------------------------------
// ECOICOP v2 invoice-level classifications (root = ECOICOP division)
// ---------------------------------------------------------------------------

/** ECOICOP 01 → 01.1 → 01.1.1  (Grocery / food purchases) */
const INV_FOOD = makeClassification(ClassificationSystem.EcoicopV2, "01.1.1", [
  ["division", "01", "Food and non-alcoholic beverages"],
  ["group", "01.1", "Food"],
  ["class", "01.1.1", "Cereals and cereal products (ND)"],
]);

/** ECOICOP 11 → 11.1 → 11.1.1  (Restaurant / fast-food purchases) */
const INV_RESTAURANT = makeClassification(ClassificationSystem.EcoicopV2, "11.1.1", [
  ["division", "11", "Restaurants and accommodation services"],
  ["group", "11.1", "Food and beverage serving services"],
  ["class", "11.1.1", "Restaurants, cafés and the like (S)"],
]);

/** ECOICOP 05 → 05.6 → 05.6.1 → 05.6.1.1  (Household cleaning) */
const INV_CLEANING = makeClassification(ClassificationSystem.EcoicopV2, "05.6.1.1", [
  ["division", "05", "Furnishings, household equipment and routine household maintenance"],
  ["group", "05.6", "Goods and services for routine household maintenance"],
  ["class", "05.6.1", "Non-durable household goods (ND)"],
  ["subclass", "05.6.1.1", "Household cleaning and maintenance products (ND)"],
]);

// ---------------------------------------------------------------------------
// GS1 GPC product-level classifications (root = GPC segment)
// ---------------------------------------------------------------------------

/** GPC 50000000 → 50130000  (Dairy / eggs / butter / yogurt) */
const PROD_DAIRY = makeClassification(ClassificationSystem.Gs1Gpc, "50130000", [
  ["segment", "50000000", "Food/Beverage"],
  ["family", "50130000", "Milk/Butter/Cream/Yogurts/Cheese/Eggs/Substitutes"],
]);

/** GPC 50000000 → 50100000  (Fruit & vegetable products) */
const PROD_FRUITS_VEG = makeClassification(ClassificationSystem.Gs1Gpc, "50100000", [
  ["segment", "50000000", "Food/Beverage"],
  ["family", "50100000", "Fruits/Vegetables/Nuts/Seeds Prepared/Processed"],
]);

/** GPC 50000000 → 50200000  (Beverages — non-alcoholic and alcoholic) */
const PROD_BEVERAGES = makeClassification(ClassificationSystem.Gs1Gpc, "50200000", [
  ["segment", "50000000", "Food/Beverage"],
  ["family", "50200000", "Beverages"],
]);

/** GPC 50000000  (General food — meat, fish, bakery, dry goods) */
const PROD_FOOD_GENERAL = makeClassification(ClassificationSystem.Gs1Gpc, "50000000", [["segment", "50000000", "Food/Beverage"]]);

/** GPC 47000000 → 47100000  (Cleaning products) */
const PROD_CLEANING = makeClassification(ClassificationSystem.Gs1Gpc, "47100000", [
  ["segment", "47000000", "Cleaning/Hygiene Products"],
  ["family", "47100000", "Cleaning Products"],
]);

/** GPC 53000000  (Beauty / personal care — null classification sentinel variant kept as example) */
const PROD_PERSONAL_CARE = makeClassification(ClassificationSystem.Gs1Gpc, "53000000", [
  ["segment", "53000000", "Beauty/Personal Care/Hygiene"],
]);

/**
 * Creates a mock invoice with realistic data.
 *
 * @param overrides - Partial invoice properties to override defaults
 * @returns Complete invoice object
 */
export function createMockInvoice(overrides: Partial<Invoice>): Invoice {
  const defaultScan: InvoiceScan = {
    type: InvoiceScanType.JPEG,
    location: "https://cdn.arolariu.ro/invoices/mock-scan.jpg",
    metadata: {},
  };

  const defaultPaymentInfo: PaymentInformation = {
    totalCostAmount: 100,
    totalTaxAmount: 19,
    subtotalAmount: 0,
    tipAmount: 0,
    transactionDate: new Date(),
    paymentType: 200,
    currency: {
      code: "RON",
      symbol: "lei",
      name: "Romanian Leu",
    },
  };

  return {
    id: `invoice-${globalThis.crypto.randomUUID()}`,
    name: "Mock Invoice",
    description: "Generated for Storybook",
    userIdentifier: "user_mock123",
    sharedWith: [],
    classification: null,
    scans: [defaultScan],
    paymentInformation: defaultPaymentInfo,
    merchantReference: "merchant-mock-001",
    items: [],
    possibleRecipes: [],
    additionalMetadata: {},
    receiptType: "Itemized",
    countryRegion: "RO",
    taxDetails: [],
    payments: [],
    createdAt: new Date(),
    createdBy: "user_mock123",
    lastUpdatedAt: new Date(),
    lastUpdatedBy: "user_mock123",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
    ...overrides,
  };
}

/**
 * Creates a mock product with realistic data.
 *
 * @param overrides - Partial product properties to override defaults
 * @returns Complete product object
 */
export function createMockProduct(overrides: Partial<Product>): Product {
  return {
    name: "Product",
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 10,
    totalPrice: 10,
    metadata: {
      isEdited: false,
      isComplete: true,
      isSoftDeleted: false,
      confidence: 1,
    },
    classification: PROD_FOOD_GENERAL,
    allergenAssessment: null,
    ...overrides,
  };
}

// Merchant IDs for consistent mock data
export const MOCK_MERCHANTS = {
  LIDL: "merchant-lidl-001",
  KAUFLAND: "merchant-kaufland-001",
  CARREFOUR: "merchant-carrefour-001",
  MEGA_IMAGE: "merchant-mega-image-001",
  AUCHAN: "merchant-auchan-001",
  PROFI: "merchant-profi-001",
  PENNY: "merchant-penny-001",
  MCDONALD: "merchant-mcdonald-001",
  KFC: "merchant-kfc-001",
  PIZZA_HUT: "merchant-pizza-hut-001",
};

// Date helpers for generating past dates
const getDateMonthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const getRandomDateInMonth = (monthsAgo: number): Date => {
  const date = getDateMonthsAgo(monthsAgo);
  const randomValues = new Uint32Array(1);
  globalThis.crypto.getRandomValues(randomValues);
  const day = ((randomValues[0] ?? 0) % 28) + 1; // Safe day range for all months
  date.setDate(day);
  return date;
};

/**
 * Comprehensive mock invoice dataset for statistics testing.
 * Includes 15+ invoices spanning 6 months with diverse data.
 */
export const mockInvoices: Invoice[] = [
  // Month 0 (Current) - RON invoices
  createMockInvoice({
    id: "invoice-001",
    name: "Weekly Groceries - Lidl",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.LIDL,
    paymentInformation: {
      totalCostAmount: 245.5,
      totalTaxAmount: 23,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: getRandomDateInMonth(0),
      paymentType: 200,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    },
    items: [
      createMockProduct({
        name: "Milk 2.5% 1 Liter",
        classification: PROD_DAIRY,
        quantity: 2,
        price: 6.5,
        totalPrice: 13,
      }),
      createMockProduct({
        name: "White Bread 500g",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 4.2,
        totalPrice: 4.2,
      }),
      createMockProduct({
        name: "Chicken Breast",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 22.8,
        totalPrice: 22.8,
      }),
      createMockProduct({
        name: "Large Eggs",
        classification: PROD_DAIRY,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
      createMockProduct({
        name: "Tomatoes",
        classification: PROD_FRUITS_VEG,
        quantity: 1.2,
        price: 8.5,
        totalPrice: 10.2,
      }),
      createMockProduct({
        name: "Orange Juice",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 9,
        totalPrice: 18,
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-002",
    name: "Fast Food - McDonald's",
    classification: INV_RESTAURANT,
    merchantReference: MOCK_MERCHANTS.MCDONALD,
    paymentInformation: {
      totalCostAmount: 45,
      totalTaxAmount: 8.55,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: getRandomDateInMonth(0),
      paymentType: 200,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    },
    items: [
      createMockProduct({
        name: "Big Mac Meal",
        // no taxonomy classification for undifferentiated fast-food items
        classification: null,
        quantity: 2,
        price: 22.5,
        totalPrice: 45,
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  // Month 1 - EUR invoice
  createMockInvoice({
    id: "invoice-003",
    name: "Shopping in Germany",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.LIDL,
    paymentInformation: {
      totalCostAmount: 45.8,
      totalTaxAmount: 8.7,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: getRandomDateInMonth(1),
      paymentType: 200,
      currency: {code: "EUR", symbol: "€", name: "Euro"},
    },
    items: [
      createMockProduct({
        name: "Gouda Cheese",
        classification: PROD_DAIRY,
        quantity: 1,
        price: 8.5,
        totalPrice: 8.5,
      }),
      createMockProduct({
        name: "Coffee Beans",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 12.5,
        totalPrice: 25,
      }),
      createMockProduct({
        name: "Milk Chocolate",
        classification: PROD_FOOD_GENERAL,
        quantity: 3,
        price: 4.1,
        totalPrice: 12.3,
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
  }),

  createMockInvoice({
    id: "invoice-004",
    name: "Weekly Shopping - Kaufland",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.KAUFLAND,
    paymentInformation: {
      totalCostAmount: 312.4,
      totalTaxAmount: 29.7,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: getRandomDateInMonth(1),
      paymentType: 200,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    },
    items: [
      createMockProduct({
        name: "Red Apples",
        classification: PROD_FRUITS_VEG,
      }),
      createMockProduct({
        name: "Penne Pasta",
        classification: PROD_FOOD_GENERAL,
        quantity: 3,
        price: 5.8,
        totalPrice: 17.4,
      }),
      createMockProduct({
        name: "Extra Virgin Olive Oil",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
      }),
      createMockProduct({
        name: "Fresh Salmon Fillet",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 42.5,
        totalPrice: 42.5,
      }),
      createMockProduct({
        name: "Greek Yogurt",
        classification: PROD_DAIRY,
        quantity: 4,
        price: 8.2,
        totalPrice: 32.8,
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
  }),

  // Month 2 - USD invoice
  createMockInvoice({
    id: "invoice-005",
    name: "Business Trip - USA",
    classification: INV_RESTAURANT,
    merchantReference: MOCK_MERCHANTS.MCDONALD,
    paymentInformation: {
      totalCostAmount: 28.5,
      totalTaxAmount: 2.85,
      transactionDate: getRandomDateInMonth(2),
      currency: {code: "USD", symbol: "$", name: "US Dollar"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Quarter Pounder with Cheese Meal",
        classification: null,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
      createMockProduct({
        name: "Chicken McNuggets",
        classification: null,
        quantity: 1,
        price: 16,
        totalPrice: 16,
      }),
    ],
    createdAt: getRandomDateInMonth(2),
    lastUpdatedAt: getRandomDateInMonth(2),
  }),

  createMockInvoice({
    id: "invoice-006",
    name: "Cleaning Supplies - Carrefour",
    classification: INV_CLEANING,
    merchantReference: MOCK_MERCHANTS.CARREFOUR,
    paymentInformation: {
      totalCostAmount: 145.7,
      totalTaxAmount: 27.68,
      transactionDate: getRandomDateInMonth(2),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Laundry Detergent",
        classification: PROD_CLEANING,
        quantity: 2,
        price: 32.5,
        totalPrice: 65,
      }),
      createMockProduct({
        name: "Paper Towels",
        classification: PROD_CLEANING,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
      }),
      createMockProduct({
        name: "Dish Washing Liquid",
        classification: PROD_CLEANING,
        quantity: 3,
        price: 8.6,
        totalPrice: 25.8,
      }),
    ],
    createdAt: getRandomDateInMonth(2),
    lastUpdatedAt: getRandomDateInMonth(2),
  }),

  // Month 3
  createMockInvoice({
    id: "invoice-007",
    name: "Weekly Groceries - Mega Image",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.MEGA_IMAGE,
    paymentInformation: {
      totalCostAmount: 198.3,
      totalTaxAmount: 18.8,
      transactionDate: getRandomDateInMonth(3),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Bananas",
        classification: PROD_FRUITS_VEG,
        quantity: 1.5,
        price: 7.5,
        totalPrice: 11.25,
      }),
      createMockProduct({
        name: "Basmati Rice",
        classification: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 14.2,
        totalPrice: 28.4,
      }),
      createMockProduct({
        name: "Creamy Peanut Butter",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 18.5,
        totalPrice: 18.5,
      }),
      createMockProduct({
        name: "Almond Milk Unsweetened",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 12.8,
        totalPrice: 25.6,
      }),
    ],
    createdAt: getRandomDateInMonth(3),
    lastUpdatedAt: getRandomDateInMonth(3),
  }),

  createMockInvoice({
    id: "invoice-008",
    name: "Pizza Night - Pizza Hut",
    classification: INV_RESTAURANT,
    merchantReference: MOCK_MERCHANTS.PIZZA_HUT,
    paymentInformation: {
      totalCostAmount: 89,
      totalTaxAmount: 16.91,
      transactionDate: getRandomDateInMonth(3),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Margherita Pizza",
        classification: null,
        quantity: 2,
        price: 35,
        totalPrice: 70,
      }),
      createMockProduct({
        name: "Garlic Bread Sticks",
        classification: null,
        quantity: 1,
        price: 19,
        totalPrice: 19,
      }),
    ],
    createdAt: getRandomDateInMonth(3),
    lastUpdatedAt: getRandomDateInMonth(3),
  }),

  // Month 4
  createMockInvoice({
    id: "invoice-009",
    name: "Monthly Shopping - Auchan",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.AUCHAN,
    paymentInformation: {
      totalCostAmount: 425.6,
      totalTaxAmount: 40.4,
      transactionDate: getRandomDateInMonth(4),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Beef Ribeye Steak",
        classification: PROD_FOOD_GENERAL,
        quantity: 1.2,
        price: 58,
        totalPrice: 69.6,
      }),
      createMockProduct({
        name: "Frozen Shrimp",
        classification: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 38.5,
        totalPrice: 77,
      }),
      createMockProduct({
        name: "Red Wine Merlot",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 45,
        totalPrice: 90,
      }),
      createMockProduct({
        name: "Parmesan Cheese",
        classification: PROD_DAIRY,
        quantity: 1,
        price: 32.8,
        totalPrice: 32.8,
      }),
    ],
    createdAt: getRandomDateInMonth(4),
    lastUpdatedAt: getRandomDateInMonth(4),
  }),

  createMockInvoice({
    id: "invoice-010",
    name: "Quick Shop - Profi",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.PROFI,
    paymentInformation: {
      totalCostAmount: 67.5,
      totalTaxAmount: 6.4,
      transactionDate: getRandomDateInMonth(4),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Mineral Water",
        classification: PROD_BEVERAGES,
        quantity: 1,
        price: 15.5,
        totalPrice: 15.5,
      }),
      createMockProduct({
        name: "BBQ Potato Chips",
        classification: PROD_FOOD_GENERAL,
        quantity: 3,
        price: 8.5,
        totalPrice: 25.5,
      }),
      createMockProduct({
        name: "Coca-Cola",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 13.25,
        totalPrice: 26.5,
      }),
    ],
    createdAt: getRandomDateInMonth(4),
    lastUpdatedAt: getRandomDateInMonth(4),
  }),

  // Month 5
  createMockInvoice({
    id: "invoice-011",
    name: "Weekend Groceries - Penny",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.PENNY,
    paymentInformation: {
      totalCostAmount: 178.9,
      totalTaxAmount: 17,
      transactionDate: getRandomDateInMonth(5),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Salted Butter",
        classification: PROD_DAIRY,
        quantity: 2,
        price: 9.5,
        totalPrice: 19,
      }),
      createMockProduct({
        name: "Wildflower Honey",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 28.5,
        totalPrice: 28.5,
      }),
      createMockProduct({
        name: "Soy Sauce",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 12.4,
        totalPrice: 12.4,
      }),
      createMockProduct({
        name: "Tuna in Oil",
        classification: PROD_FOOD_GENERAL,
        quantity: 6,
        price: 11.5,
        totalPrice: 69,
      }),
    ],
    createdAt: getRandomDateInMonth(5),
    lastUpdatedAt: getRandomDateInMonth(5),
  }),

  createMockInvoice({
    id: "invoice-012",
    name: "Lunch - KFC",
    classification: INV_RESTAURANT,
    merchantReference: MOCK_MERCHANTS.KFC,
    paymentInformation: {
      totalCostAmount: 56,
      totalTaxAmount: 10.64,
      transactionDate: getRandomDateInMonth(5),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Fried Chicken Bucket",
        classification: null,
        quantity: 1,
        price: 56,
        totalPrice: 56,
      }),
    ],
    createdAt: getRandomDateInMonth(5),
    lastUpdatedAt: getRandomDateInMonth(5),
  }),

  // Additional current month invoices for variety
  createMockInvoice({
    id: "invoice-013",
    name: "Fresh Produce - Lidl",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.LIDL,
    paymentInformation: {
      totalCostAmount: 89.3,
      totalTaxAmount: 8.5,
      transactionDate: getRandomDateInMonth(0),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Iceberg Lettuce",
        classification: PROD_FRUITS_VEG,
        quantity: 2,
        price: 5.5,
        totalPrice: 11,
      }),
      createMockProduct({
        name: "Cucumbers",
        classification: PROD_FRUITS_VEG,
        quantity: 1,
        price: 6.8,
        totalPrice: 6.8,
      }),
      createMockProduct({
        name: "Mixed Bell Peppers",
        classification: PROD_FRUITS_VEG,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-014",
    name: "Snacks & Beverages - Kaufland",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.KAUFLAND,
    paymentInformation: {
      totalCostAmount: 125.4,
      totalTaxAmount: 23.83,
      transactionDate: getRandomDateInMonth(0),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Lager Beer Pack",
        classification: PROD_BEVERAGES,
        quantity: 2,
        price: 22.5,
        totalPrice: 45,
      }),
      createMockProduct({
        name: "Salted Pretzels",
        classification: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 11.2,
        totalPrice: 22.4,
      }),
      createMockProduct({
        name: "Microwave Popcorn",
        classification: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 9,
        totalPrice: 18,
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-015",
    name: "Breakfast Items - Mega Image",
    classification: INV_FOOD,
    merchantReference: MOCK_MERCHANTS.MEGA_IMAGE,
    paymentInformation: {
      totalCostAmount: 95.7,
      totalTaxAmount: 9.1,
      transactionDate: getRandomDateInMonth(1),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Corn Flakes",
        classification: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 15.5,
        totalPrice: 31,
      }),
      createMockProduct({
        name: "Strawberry Jam",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 14.2,
        totalPrice: 14.2,
      }),
      createMockProduct({
        name: "Butter Croissants",
        classification: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 18.5,
        totalPrice: 18.5,
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
  }),

  // Unclassified invoice — exercises the null-classification / "unclassified" path
  createMockInvoice({
    id: "invoice-016",
    name: "Personal Care - Carrefour",
    // classification intentionally left null so the unclassified bucket is exercised
    classification: null,
    merchantReference: MOCK_MERCHANTS.CARREFOUR,
    paymentInformation: {
      totalCostAmount: 72.5,
      totalTaxAmount: 13.78,
      transactionDate: getRandomDateInMonth(2),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Shampoo",
        classification: PROD_PERSONAL_CARE,
        quantity: 2,
        price: 18.5,
        totalPrice: 37,
      }),
      createMockProduct({
        name: "Toothpaste",
        classification: PROD_PERSONAL_CARE,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
    ],
    createdAt: getRandomDateInMonth(2),
    lastUpdatedAt: getRandomDateInMonth(2),
  }),
];

/**
 * Empty invoice dataset for testing empty states.
 */
export const emptyInvoices: Invoice[] = [];

/**
 * Single invoice dataset for minimal data scenarios.
 */
export const singleInvoice: Invoice[] = [mockInvoices[0] as Invoice];

/**
 * Single currency (RON only) dataset.
 */
export const ronOnlyInvoices: Invoice[] = mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "RON");
