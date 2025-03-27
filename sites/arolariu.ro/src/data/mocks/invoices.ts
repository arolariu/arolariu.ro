/** @format */

import type {Currency} from "@/types/DDD";
import {
  RecipeComplexity,
  type Allergen,
  type Invoice,
  type InvoiceCategory,
  type Merchant,
  type MerchantCategory,
  type PaymentInformation,
  type PaymentType,
  type Product,
  type ProductCategory,
  type Recipe,
} from "@/types/invoices";
import {faker as fake} from "@faker-js/faker";

const generateFakeInvoice = (): Invoice => {
  const invoiceCategory = fake.number.int({min: 1, max: 3}) as InvoiceCategory;
  const products = Array.from({length: fake.number.int({min: 3, max: 30})}, generateFakeInvoiceProduct);
  const totalAmount = products.reduce((acc, product) => acc + product.totalPrice, 0);

  return {
    id: fake.string.uuid(),
    category: invoiceCategory,
    createdAt: fake.date.past(),
    merchantReference: fake.string.uuid(),
    createdBy: fake.string.uuid(),
    description: fake.lorem.sentence({min: 7, max: 30}),
    isImportant: fake.datatype.boolean(),
    isSoftDeleted: fake.datatype.boolean(),
    lastUpdatedAt: fake.date.recent(),
    lastUpdatedBy: fake.string.uuid(),
    name: fake.lorem.sentence(3),
    numberOfUpdates: fake.number.int({min: 0, max: 100}),
    photoLocation: fake.image.url(),
    userIdentifier: fake.string.uuid(),
    sharedWith: Array.from({length: fake.number.int({min: 0, max: 5})}, () => fake.string.uuid()),
    items: products,
    paymentInformation: {
      transactionDate: fake.date.past(),
      paymentType: fake.number.int({min: 0, max: 4}) as PaymentType,
      currency: {
        code: fake.finance.currencyCode(),
        name: fake.finance.currencyName(),
        symbol: fake.finance.currencySymbol(),
      } satisfies Currency,
      totalCostAmount: totalAmount,
      totalTaxAmount: fake.number.float({min: totalAmount * 0.05, max: totalAmount / 2, multipleOf: 3}),
    } satisfies PaymentInformation,
    possibleRecipes: Array.from(
      {length: fake.number.int({min: 0, max: 3})},
      () =>
        ({
          name: fake.lorem.sentence(3),
          complexity: fake.number.int({min: 0, max: 3}) as RecipeComplexity,
          ingredients: Array.from({length: fake.number.int({min: 3, max: 10})}, generateFakeInvoiceProduct),
          duration: `${fake.number.int({min: 5, max: 120})} minutes`,
          description: fake.lorem.sentence({min: 10, max: 80}),
          referenceForMoreDetails: fake.internet.url(),
          cookingTime: fake.number.int({min: 5, max: 120}),
          preparationTime: fake.number.int({min: 5, max: 120}),
          instructions: fake.lorem.sentence({min: 10, max: 50}),
        }) satisfies Recipe,
    ),
    additionalMetadata: {
      isComplete: fake.string.nanoid(),
      isEdited: fake.string.nanoid(),
      isSoftDeleted: fake.string.nanoid(),
    },
  } satisfies Invoice;
};

const generateFakeMerchant = (): Merchant => ({
  category: fake.number.int({min: 1, max: 3}) as MerchantCategory,
  address: fake.location.streetAddress(true),
  name: fake.company.name(),
  createdAt: fake.date.past(),
  createdBy: fake.string.uuid(),
  description: fake.lorem.sentence(10),
  id: fake.string.uuid(),
  isImportant: fake.datatype.boolean(),
  isSoftDeleted: fake.datatype.boolean(),
  lastUpdatedAt: fake.date.recent(),
  lastUpdatedBy: fake.string.uuid(),
  numberOfUpdates: fake.number.int({min: 0, max: 100}),
  parentCompanyId: fake.string.uuid(),
  phoneNumber: fake.phone.number(),
});

const generateFakeInvoiceProduct = (): Product => {
  const allergensList = [
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
  const allergens = Array.from({length: fake.number.int({min: 0, max: 3})}, () => ({
    name: fake.number.int({min: 0, max: 13}),
  })).map((allergen) => ({name: allergensList[allergen.name]}));

  const price = fake.number.float({min: 0, max: 1000, multipleOf: 2});
  const quantity = fake.number.int({min: 1, max: 100});
  const totalPrice = price * quantity;

  return {
    category: fake.number.int({min: 0, max: 13}) as ProductCategory,
    detectedAllergens: [...allergens] as Allergen[],
    genericName: fake.commerce.productName(),
    price,
    productCode: fake.string.alphanumeric(8),
    quantity,
    rawName: fake.commerce.productName(),
    quantityUnit: fake.commerce.productMaterial(),
    totalPrice,
    metadata: {
      isComplete: fake.datatype.boolean(),
      isEdited: fake.datatype.boolean(),
      isSoftDeleted: fake.datatype.boolean(),
    },
  } satisfies Product;
};

const shortIterable = Array.from({length: fake.number.int({min: 3, max: 10})});
const longIterable = Array.from({length: fake.number.int({min: 20, max: 100})});

export const FakeProduct: Product = generateFakeInvoiceProduct();
export const FakeMerchant: Merchant = generateFakeMerchant();
export const FakeInvoice: Invoice = generateFakeInvoice();

export const FakeInvoiceShortList: Invoice[] = Array.from(shortIterable, generateFakeInvoice);
export const FakeInvoiceBigList: Invoice[] = Array.from(longIterable, generateFakeInvoice);

export const FakeMerchantShortList: Merchant[] = Array.from(shortIterable, generateFakeMerchant);
export const FakeMerchantBigList: Merchant[] = Array.from(longIterable, generateFakeMerchant);

export const FakeProductShortList: Product[] = Array.from(shortIterable, generateFakeInvoiceProduct);
export const FakeProductBigList: Product[] = Array.from(longIterable, generateFakeInvoiceProduct);
