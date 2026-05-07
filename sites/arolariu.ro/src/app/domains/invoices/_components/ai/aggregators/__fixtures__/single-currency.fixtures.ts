import {InvoiceCategory} from "@/types/invoices";
import type {Invoice, Product} from "@/types/invoices";
import {ProductCategory} from "@/types/invoices";

const MERCHANTS = [
  {id: "m-lidl", name: "Lidl"},
  {id: "m-mega", name: "Mega Image"},
  {id: "m-auchan", name: "Auchan"},
  {id: "m-carrefour", name: "Carrefour"},
  {id: "m-kfc", name: "KFC"},
] as const;

const PRODUCT_TEMPLATES = [
  {name: "Bread", price: 2.5, category: ProductCategory.BAKED_GOODS},
  {name: "Milk 2% 1L", price: 1.8, category: ProductCategory.DAIRY},
  {name: "Eggs (10-pack)", price: 3.5, category: ProductCategory.GROCERIES},
  {name: "Beef ribeye 500g", price: 18.5, category: ProductCategory.MEAT},
  {name: "Apples 1kg", price: 2.2, category: ProductCategory.FRUITS},
  {name: "Pinot Noir 0.75L", price: 14.9, category: ProductCategory.ALCOHOLIC_BEVERAGES},
  {name: "Detergent 2L", price: 9.8, category: ProductCategory.CLEANING_SUPPLIES},
  {name: "KFC bucket", price: 32.0, category: ProductCategory.NOT_DEFINED},
] as const;

function makeProduct(template: (typeof PRODUCT_TEMPLATES)[number], qty: number): Product {
  return {
    name: template.name,
    category: template.category,
    quantity: qty,
    quantityUnit: "pcs",
    productCode: "",
    price: template.price,
    totalPrice: Number((template.price * qty).toFixed(2)),
    detectedAllergens: [],
    metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 0.95},
  };
}

function makeInvoice(idx: number, dateISO: string, merchantIdx: number, items: Product[], category: InvoiceCategory): Invoice {
  const total = Number(items.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(2));
  return {
    id: `fix-eur-${String(idx).padStart(3, "0")}`,
    name: `Receipt ${idx}`,
    description: "",
    userIdentifier: "fix-user",
    sharedWith: [],
    category,
    scans: [],
    paymentInformation: {
      currency: "EUR",
      totalCostAmount: total,
      totalTaxAmount: 0,
      transactionDate: new Date(dateISO),
      paymentType: "card",
    },
    merchantReference: MERCHANTS[merchantIdx]!.id,
    items,
    possibleRecipes: [],
    additionalMetadata: {},
    receiptType: "Itemized",
    countryRegion: "RO",
    taxDetails: [],
    payments: [],
    createdAt: new Date(dateISO),
    lastUpdatedAt: new Date(dateISO),
    isDeleted: false,
  } as unknown as Invoice;
}

/**
 * Returns 50 deterministic EUR invoices across 18 months (2025-01 .. 2026-06),
 * weighted: 30 grocery, 12 fast food, 8 cleaning supplies. Realistic merchant
 * mix.
 */
export function singleCurrencyFixture(asOf: Date = new Date("2026-05-01T12:00:00Z")): ReadonlyArray<Invoice> {
  const result: Invoice[] = [];
  let idx = 0;
  for (let monthOffset = 0; monthOffset < 18; monthOffset++) {
    for (let i = 0; i < 3; i++) {
      const day = 5 + i * 9;
      const date = new Date(asOf);
      date.setUTCMonth(date.getUTCMonth() - monthOffset);
      date.setUTCDate(day);
      const dateISO = date.toISOString();

      const variant = (monthOffset + i) % 4;
      let merchantIdx: number;
      let items: Product[];
      let category: InvoiceCategory;
      if (variant === 0) {
        merchantIdx = 0;
        items = [
          makeProduct(PRODUCT_TEMPLATES[0]!, 2),
          makeProduct(PRODUCT_TEMPLATES[1]!, 3),
          makeProduct(PRODUCT_TEMPLATES[2]!, 1),
        ];
        category = InvoiceCategory.GROCERY;
      } else if (variant === 1) {
        merchantIdx = 1;
        items = [
          makeProduct(PRODUCT_TEMPLATES[4]!, 1),
          makeProduct(PRODUCT_TEMPLATES[3]!, 1),
        ];
        category = InvoiceCategory.GROCERY;
      } else if (variant === 2) {
        merchantIdx = 4;
        items = [makeProduct(PRODUCT_TEMPLATES[7]!, 1)];
        category = InvoiceCategory.FAST_FOOD;
      } else {
        merchantIdx = 2;
        items = [
          makeProduct(PRODUCT_TEMPLATES[6]!, 1),
          makeProduct(PRODUCT_TEMPLATES[5]!, 2),
        ];
        category = InvoiceCategory.HOME_CLEANING;
      }

      result.push(makeInvoice(idx++, dateISO, merchantIdx, items, category));
    }
  }
  return result;
}