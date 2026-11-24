/**
 * @fileoverview Mock invoice data for statistics chart Storybook stories.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/__mocks__/mockInvoices
 *
 * @remarks
 * Provides realistic mock invoice data for testing and demonstrating
 * statistics charts in Storybook. Data includes diverse:
 * - Currencies (RON, EUR, USD)
 * - Flat receipt and product categories
 * - Merchants
 * - Date ranges (past 6 months)
 * - Allergens
 * - Transaction amounts
 */

import {InvoiceScanType, type Invoice, type InvoiceScan, type PaymentInformation, type Product} from "@/types/invoices";
import {InvoiceCategory, ProductCategory} from "@/types/invoices/Category";

const INV_FOOD = InvoiceCategory.Groceries;
const INV_RESTAURANT = InvoiceCategory.RestaurantDining;
const INV_CLEANING = InvoiceCategory.CleaningSupplies;
const PROD_DAIRY = ProductCategory.Milk;
const PROD_FRUITS_VEG = ProductCategory.FreshFruit;
const PROD_BEVERAGES = ProductCategory.Juice;
const PROD_FOOD_GENERAL = ProductCategory.Bread;
const PROD_CLEANING = ProductCategory.HouseholdCleaners;
const PROD_PERSONAL_CARE = ProductCategory.SkinCare;

/**
 * Creates a mock invoice with realistic data.
 *
 * @param overrides - Partial invoice properties to override defaults
 * @returns Complete invoice object
 */
export function createMockInvoice(overrides: Partial<Invoice>): Invoice {
  const defaultScan: InvoiceScan = {
    type: InvoiceScanType.JPEG,
    location: "https://storage.blob.core.windows.net/invoices/mock-scan.jpg",
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
    category: null,
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
    category: PROD_FOOD_GENERAL,
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
    category: INV_FOOD,
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
        category: PROD_DAIRY,
        quantity: 2,
        price: 6.5,
        totalPrice: 13,
      }),
      createMockProduct({
        name: "White Bread 500g",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 4.2,
        totalPrice: 4.2,
      }),
      createMockProduct({
        name: "Chicken Breast",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 22.8,
        totalPrice: 22.8,
      }),
      createMockProduct({
        name: "Large Eggs",
        category: PROD_DAIRY,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
      createMockProduct({
        name: "Tomatoes",
        category: PROD_FRUITS_VEG,
        quantity: 1.2,
        price: 8.5,
        totalPrice: 10.2,
      }),
      createMockProduct({
        name: "Orange Juice",
        category: PROD_BEVERAGES,
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
    category: INV_RESTAURANT,
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
        // uncategorized for undifferentiated fast-food items
        category: null,
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
    category: INV_FOOD,
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
        category: PROD_DAIRY,
        quantity: 1,
        price: 8.5,
        totalPrice: 8.5,
      }),
      createMockProduct({
        name: "Coffee Beans",
        category: PROD_BEVERAGES,
        quantity: 2,
        price: 12.5,
        totalPrice: 25,
      }),
      createMockProduct({
        name: "Milk Chocolate",
        category: PROD_FOOD_GENERAL,
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
    category: INV_FOOD,
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
        category: PROD_FRUITS_VEG,
      }),
      createMockProduct({
        name: "Penne Pasta",
        category: PROD_FOOD_GENERAL,
        quantity: 3,
        price: 5.8,
        totalPrice: 17.4,
      }),
      createMockProduct({
        name: "Extra Virgin Olive Oil",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
      }),
      createMockProduct({
        name: "Fresh Salmon Fillet",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 42.5,
        totalPrice: 42.5,
      }),
      createMockProduct({
        name: "Greek Yogurt",
        category: PROD_DAIRY,
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
    category: INV_RESTAURANT,
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
        category: null,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
      }),
      createMockProduct({
        name: "Chicken McNuggets",
        category: null,
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
    category: INV_CLEANING,
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
        category: PROD_CLEANING,
        quantity: 2,
        price: 32.5,
        totalPrice: 65,
      }),
      createMockProduct({
        name: "Paper Towels",
        category: PROD_CLEANING,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
      }),
      createMockProduct({
        name: "Dish Washing Liquid",
        category: PROD_CLEANING,
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
    category: INV_FOOD,
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
        category: PROD_FRUITS_VEG,
        quantity: 1.5,
        price: 7.5,
        totalPrice: 11.25,
      }),
      createMockProduct({
        name: "Basmati Rice",
        category: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 14.2,
        totalPrice: 28.4,
      }),
      createMockProduct({
        name: "Creamy Peanut Butter",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 18.5,
        totalPrice: 18.5,
      }),
      createMockProduct({
        name: "Almond Milk Unsweetened",
        category: PROD_BEVERAGES,
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
    category: INV_RESTAURANT,
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
        category: null,
        quantity: 2,
        price: 35,
        totalPrice: 70,
      }),
      createMockProduct({
        name: "Garlic Bread Sticks",
        category: null,
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
    category: INV_FOOD,
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
        category: PROD_FOOD_GENERAL,
        quantity: 1.2,
        price: 58,
        totalPrice: 69.6,
      }),
      createMockProduct({
        name: "Frozen Shrimp",
        category: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 38.5,
        totalPrice: 77,
      }),
      createMockProduct({
        name: "Red Wine Merlot",
        category: PROD_BEVERAGES,
        quantity: 2,
        price: 45,
        totalPrice: 90,
      }),
      createMockProduct({
        name: "Parmesan Cheese",
        category: PROD_DAIRY,
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
    category: INV_FOOD,
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
        category: PROD_BEVERAGES,
        quantity: 1,
        price: 15.5,
        totalPrice: 15.5,
      }),
      createMockProduct({
        name: "BBQ Potato Chips",
        category: PROD_FOOD_GENERAL,
        quantity: 3,
        price: 8.5,
        totalPrice: 25.5,
      }),
      createMockProduct({
        name: "Coca-Cola",
        category: PROD_BEVERAGES,
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
    category: INV_FOOD,
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
        category: PROD_DAIRY,
        quantity: 2,
        price: 9.5,
        totalPrice: 19,
      }),
      createMockProduct({
        name: "Wildflower Honey",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 28.5,
        totalPrice: 28.5,
      }),
      createMockProduct({
        name: "Soy Sauce",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 12.4,
        totalPrice: 12.4,
      }),
      createMockProduct({
        name: "Tuna in Oil",
        category: PROD_FOOD_GENERAL,
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
    category: INV_RESTAURANT,
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
        category: null,
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
    category: INV_FOOD,
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
        category: PROD_FRUITS_VEG,
        quantity: 2,
        price: 5.5,
        totalPrice: 11,
      }),
      createMockProduct({
        name: "Cucumbers",
        category: PROD_FRUITS_VEG,
        quantity: 1,
        price: 6.8,
        totalPrice: 6.8,
      }),
      createMockProduct({
        name: "Mixed Bell Peppers",
        category: PROD_FRUITS_VEG,
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
    category: INV_FOOD,
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
        category: PROD_BEVERAGES,
        quantity: 2,
        price: 22.5,
        totalPrice: 45,
      }),
      createMockProduct({
        name: "Salted Pretzels",
        category: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 11.2,
        totalPrice: 22.4,
      }),
      createMockProduct({
        name: "Microwave Popcorn",
        category: PROD_FOOD_GENERAL,
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
    category: INV_FOOD,
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
        category: PROD_FOOD_GENERAL,
        quantity: 2,
        price: 15.5,
        totalPrice: 31,
      }),
      createMockProduct({
        name: "Strawberry Jam",
        category: PROD_FOOD_GENERAL,
        quantity: 1,
        price: 14.2,
        totalPrice: 14.2,
      }),
      createMockProduct({
        name: "Butter Croissants",
        category: PROD_FOOD_GENERAL,
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
    category: null,
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
        category: PROD_PERSONAL_CARE,
        quantity: 2,
        price: 18.5,
        totalPrice: 37,
      }),
      createMockProduct({
        name: "Toothpaste",
        category: PROD_PERSONAL_CARE,
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
