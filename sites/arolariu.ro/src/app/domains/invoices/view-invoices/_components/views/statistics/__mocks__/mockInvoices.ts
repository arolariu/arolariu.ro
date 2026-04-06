/**
 * @fileoverview Mock invoice data for statistics chart Storybook stories.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/__mocks__/mockInvoices
 *
 * @remarks
 * Provides realistic mock invoice data for testing and demonstrating
 * statistics charts in Storybook. Data includes diverse:
 * - Currencies (RON, EUR, USD)
 * - Product categories
 * - Merchants
 * - Date ranges (past 6 months)
 * - Allergens
 * - Transaction amounts
 */

import type {PaymentInformation, Product} from "@/types/invoices";
import {InvoiceCategory, InvoiceScanType, type Invoice, type InvoiceScan} from "@/types/invoices";
import {ProductCategory} from "@/types/invoices/Product";

/**
 * Creates a mock invoice with realistic data.
 *
 * @param overrides - Partial invoice properties to override defaults
 * @returns Complete invoice object
 */
export function createMockInvoice(overrides: Partial<Invoice>): Invoice {
  const defaultScan: InvoiceScan = {
    scanType: InvoiceScanType.JPEG,
    location: "https://cdn.arolariu.ro/invoices/mock-scan.jpg",
    metadata: {},
  };

  const defaultPaymentInfo: PaymentInformation = {
    totalCostAmount: 100.0,
    totalTaxAmount: 19.0,
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
    id: `invoice-${Math.random().toString(36).substring(7)}`,
    name: "Mock Invoice",
    description: "Generated for Storybook",
    userIdentifier: "user_mock123",
    sharedWith: [],
    category: InvoiceCategory.GROCERY,
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
    lastUpdatedAt: new Date(),
    ...overrides,
  } as unknown as Invoice;
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
    category: ProductCategory.GROCERIES,
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 10.0,
    totalPrice: 10.0,
    detectedAllergens: [],
    metadata: {
      isEdited: false,
      isComplete: true,
      isSoftDeleted: false,
      confidence: 1.0,
    },
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
  const day = Math.floor(Math.random() * 28) + 1; // Safe day range for all months
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
    category: InvoiceCategory.GROCERY,
    merchantReference: MOCK_MERCHANTS.LIDL,
    paymentInformation: {
      totalCostAmount: 245.5,
      totalTaxAmount: 23.0,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: getRandomDateInMonth(0),
      paymentType: 200,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    },
    items: [
      createMockProduct({
        name: "Milk 2.5% 1 Liter",
        category: ProductCategory.DAIRY,
        quantity: 2,
        price: 6.5,
        totalPrice: 13.0,
        detectedAllergens: [{name: "Lactose", description: "Milk sugar", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "White Bread 500g",
        category: ProductCategory.BAKED_GOODS,
        quantity: 1,
        price: 4.2,
        totalPrice: 4.2,
        detectedAllergens: [{name: "Gluten", description: "Wheat protein", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Chicken Breast",
        category: ProductCategory.MEAT,
        quantity: 1,
        price: 22.8,
        totalPrice: 22.8,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Large Eggs",
        category: ProductCategory.DAIRY,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
        detectedAllergens: [{name: "Eggs", description: "Chicken eggs", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Tomatoes",
        category: ProductCategory.VEGETABLES,
        quantity: 1.2,
        price: 8.5,
        totalPrice: 10.2,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Orange Juice",
        category: ProductCategory.BEVERAGES,
        quantity: 2,
        price: 9.0,
        totalPrice: 18.0,
        detectedAllergens: [],
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-002",
    name: "Fast Food - McDonald's",
    category: InvoiceCategory.FAST_FOOD,
    merchantReference: MOCK_MERCHANTS.MCDONALD,
    paymentInformation: {
      totalCostAmount: 45.0,
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
        category: ProductCategory.OTHER,
        quantity: 2,
        price: 22.5,
        totalPrice: 45.0,
        detectedAllergens: [
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: ""},
        ],
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  // Month 1 - EUR invoice
  createMockInvoice({
    id: "invoice-003",
    name: "Shopping in Germany",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.DAIRY,
        quantity: 1,
        price: 8.5,
        totalPrice: 8.5,
        detectedAllergens: [{name: "Lactose", description: "Milk sugar", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Coffee Beans",
        category: ProductCategory.BEVERAGES,
        quantity: 2,
        price: 12.5,
        totalPrice: 25.0,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Milk Chocolate",
        category: ProductCategory.GROCERIES,
        quantity: 3,
        price: 4.1,
        totalPrice: 12.3,
        detectedAllergens: [
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: ""},
          {name: "Soy", description: "Soybean derivatives", learnMoreAddress: ""},
        ],
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
  }),

  createMockInvoice({
    id: "invoice-004",
    name: "Weekly Shopping - Kaufland",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.FRUITS,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Penne Pasta",
        category: ProductCategory.GROCERIES,
        quantity: 3,
        price: 5.8,
        totalPrice: 17.4,
        detectedAllergens: [{name: "Gluten", description: "Wheat protein", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Extra Virgin Olive Oil",
        category: ProductCategory.GROCERIES,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Fresh Salmon Fillet",
        category: ProductCategory.FISH,
        quantity: 1,
        price: 42.5,
        totalPrice: 42.5,
        detectedAllergens: [{name: "Fish", description: "Seafood", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Greek Yogurt",
        category: ProductCategory.DAIRY,
        quantity: 4,
        price: 8.2,
        totalPrice: 32.8,
        detectedAllergens: [{name: "Lactose", description: "Milk sugar", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
  }),

  // Month 2 - USD invoice
  createMockInvoice({
    id: "invoice-005",
    name: "Business Trip - USA",
    category: InvoiceCategory.FAST_FOOD,
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
        category: ProductCategory.OTHER,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
        detectedAllergens: [
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: ""},
        ],
      }),
      createMockProduct({
        name: "Chicken McNuggets",
        category: ProductCategory.OTHER,
        quantity: 1,
        price: 16.0,
        totalPrice: 16.0,
        detectedAllergens: [{name: "Gluten", description: "Wheat protein", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(2),
    lastUpdatedAt: getRandomDateInMonth(2),
  }),

  createMockInvoice({
    id: "invoice-006",
    name: "Cleaning Supplies - Carrefour",
    category: InvoiceCategory.HOME_CLEANING,
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
        category: ProductCategory.CLEANING_SUPPLIES,
        quantity: 2,
        price: 32.5,
        totalPrice: 65.0,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Paper Towels",
        category: ProductCategory.CLEANING_SUPPLIES,
        quantity: 1,
        price: 28.9,
        totalPrice: 28.9,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Dish Washing Liquid",
        category: ProductCategory.CLEANING_SUPPLIES,
        quantity: 3,
        price: 8.6,
        totalPrice: 25.8,
        detectedAllergens: [],
      }),
    ],
    createdAt: getRandomDateInMonth(2),
    lastUpdatedAt: getRandomDateInMonth(2),
  }),

  // Month 3
  createMockInvoice({
    id: "invoice-007",
    name: "Weekly Groceries - Mega Image",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.VEGETABLES,
        quantity: 1.5,
        price: 7.5,
        totalPrice: 11.25,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Basmati Rice",
        category: ProductCategory.GROCERIES,
        quantity: 2,
        price: 14.2,
        totalPrice: 28.4,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Creamy Peanut Butter",
        category: ProductCategory.GROCERIES,
        quantity: 1,
        price: 18.5,
        totalPrice: 18.5,
        detectedAllergens: [{name: "Peanuts", description: "Ground peanuts", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Almond Milk Unsweetened",
        category: ProductCategory.BEVERAGES,
        quantity: 2,
        price: 12.8,
        totalPrice: 25.6,
        detectedAllergens: [{name: "Tree Nuts", description: "Almonds", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(3),
    lastUpdatedAt: getRandomDateInMonth(3),
  }),

  createMockInvoice({
    id: "invoice-008",
    name: "Pizza Night - Pizza Hut",
    category: InvoiceCategory.FAST_FOOD,
    merchantReference: MOCK_MERCHANTS.PIZZA_HUT,
    paymentInformation: {
      totalCostAmount: 89.0,
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
        category: ProductCategory.OTHER,
        quantity: 2,
        price: 35.0,
        totalPrice: 70.0,
        detectedAllergens: [
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: ""},
        ],
      }),
      createMockProduct({
        name: "Garlic Bread Sticks",
        category: ProductCategory.OTHER,
        quantity: 1,
        price: 19.0,
        totalPrice: 19.0,
        detectedAllergens: [{name: "Gluten", description: "Wheat protein", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(3),
    lastUpdatedAt: getRandomDateInMonth(3),
  }),

  // Month 4
  createMockInvoice({
    id: "invoice-009",
    name: "Monthly Shopping - Auchan",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.MEAT,
        quantity: 1.2,
        price: 58.0,
        totalPrice: 69.6,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Frozen Shrimp",
        category: ProductCategory.FISH,
        quantity: 2,
        price: 38.5,
        totalPrice: 77.0,
        detectedAllergens: [{name: "Shellfish", description: "Crustaceans", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Red Wine Merlot",
        category: ProductCategory.ALCOHOLIC_BEVERAGES,
        quantity: 2,
        price: 45.0,
        totalPrice: 90.0,
        detectedAllergens: [{name: "Sulfites", description: "Preservatives", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Parmesan Cheese",
        category: ProductCategory.DAIRY,
        quantity: 1,
        price: 32.8,
        totalPrice: 32.8,
        detectedAllergens: [{name: "Lactose", description: "Milk sugar", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(4),
    lastUpdatedAt: getRandomDateInMonth(4),
  }),

  createMockInvoice({
    id: "invoice-010",
    name: "Quick Shop - Profi",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.BEVERAGES,
        quantity: 1,
        price: 15.5,
        totalPrice: 15.5,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "BBQ Potato Chips",
        category: ProductCategory.GROCERIES,
        quantity: 3,
        price: 8.5,
        totalPrice: 25.5,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Coca-Cola",
        category: ProductCategory.BEVERAGES,
        quantity: 2,
        price: 13.25,
        totalPrice: 26.5,
        detectedAllergens: [],
      }),
    ],
    createdAt: getRandomDateInMonth(4),
    lastUpdatedAt: getRandomDateInMonth(4),
  }),

  // Month 5
  createMockInvoice({
    id: "invoice-011",
    name: "Weekend Groceries - Penny",
    category: InvoiceCategory.GROCERY,
    merchantReference: MOCK_MERCHANTS.PENNY,
    paymentInformation: {
      totalCostAmount: 178.9,
      totalTaxAmount: 17.0,
      transactionDate: getRandomDateInMonth(5),
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      subtotalAmount: 0,
      tipAmount: 0,
      paymentType: 200,
    },
    items: [
      createMockProduct({
        name: "Salted Butter",
        category: ProductCategory.DAIRY,
        quantity: 2,
        price: 9.5,
        totalPrice: 19.0,
        detectedAllergens: [{name: "Lactose", description: "Milk sugar", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Wildflower Honey",
        category: ProductCategory.GROCERIES,
        quantity: 1,
        price: 28.5,
        totalPrice: 28.5,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Soy Sauce",
        category: ProductCategory.GROCERIES,
        quantity: 1,
        price: 12.4,
        totalPrice: 12.4,
        detectedAllergens: [
          {name: "Soy", description: "Soybean derivatives", learnMoreAddress: ""},
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
        ],
      }),
      createMockProduct({
        name: "Tuna in Oil",
        category: ProductCategory.FISH,
        quantity: 6,
        price: 11.5,
        totalPrice: 69.0,
        detectedAllergens: [{name: "Fish", description: "Seafood", learnMoreAddress: ""}],
      }),
    ],
    createdAt: getRandomDateInMonth(5),
    lastUpdatedAt: getRandomDateInMonth(5),
  }),

  createMockInvoice({
    id: "invoice-012",
    name: "Lunch - KFC",
    category: InvoiceCategory.FAST_FOOD,
    merchantReference: MOCK_MERCHANTS.KFC,
    paymentInformation: {
      totalCostAmount: 56.0,
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
        category: ProductCategory.OTHER,
        quantity: 1,
        price: 56.0,
        totalPrice: 56.0,
        detectedAllergens: [
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
          {name: "Eggs", description: "Chicken eggs", learnMoreAddress: ""},
        ],
      }),
    ],
    createdAt: getRandomDateInMonth(5),
    lastUpdatedAt: getRandomDateInMonth(5),
  }),

  // Additional current month invoices for variety
  createMockInvoice({
    id: "invoice-013",
    name: "Fresh Produce - Lidl",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.VEGETABLES,
        quantity: 2,
        price: 5.5,
        totalPrice: 11.0,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Cucumbers",
        category: ProductCategory.VEGETABLES,
        quantity: 1,
        price: 6.8,
        totalPrice: 6.8,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Mixed Bell Peppers",
        category: ProductCategory.VEGETABLES,
        quantity: 1,
        price: 12.5,
        totalPrice: 12.5,
        detectedAllergens: [],
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-014",
    name: "Snacks & Beverages - Kaufland",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.ALCOHOLIC_BEVERAGES,
        quantity: 2,
        price: 22.5,
        totalPrice: 45.0,
        detectedAllergens: [{name: "Gluten", description: "Barley", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Salted Pretzels",
        category: ProductCategory.GROCERIES,
        quantity: 2,
        price: 11.2,
        totalPrice: 22.4,
        detectedAllergens: [{name: "Gluten", description: "Wheat protein", learnMoreAddress: ""}],
      }),
      createMockProduct({
        name: "Microwave Popcorn",
        category: ProductCategory.GROCERIES,
        quantity: 2,
        price: 9.0,
        totalPrice: 18.0,
        detectedAllergens: [],
      }),
    ],
    createdAt: getRandomDateInMonth(0),
    lastUpdatedAt: getRandomDateInMonth(0),
  }),

  createMockInvoice({
    id: "invoice-015",
    name: "Breakfast Items - Mega Image",
    category: InvoiceCategory.GROCERY,
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
        category: ProductCategory.GROCERIES,
        quantity: 2,
        price: 15.5,
        totalPrice: 31.0,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Strawberry Jam",
        category: ProductCategory.GROCERIES,
        quantity: 1,
        price: 14.2,
        totalPrice: 14.2,
        detectedAllergens: [],
      }),
      createMockProduct({
        name: "Butter Croissants",
        category: ProductCategory.BAKED_GOODS,
        quantity: 1,
        price: 18.5,
        totalPrice: 18.5,
        detectedAllergens: [
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: ""},
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: ""},
          {name: "Eggs", description: "Chicken eggs", learnMoreAddress: ""},
        ],
      }),
    ],
    createdAt: getRandomDateInMonth(1),
    lastUpdatedAt: getRandomDateInMonth(1),
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
