/** @format */

import Invoice, {InvoiceCategory, type Recipe} from "@/types/invoices/Invoice";
import Merchant, {MerchantCategory} from "@/types/invoices/Merchant";
import Product, {ItemCategory} from "@/types/invoices/Product";
import {faker as fake} from "@faker-js/faker";

const generateFakeInvoice = (): Invoice => ({
  id: fake.string.uuid(),
  category: fake.number.int({min: 1, max: 3}) as InvoiceCategory,
  createdAt: fake.date.anytime(),
  merchant: generateFakeMerchant(),
  createdBy: fake.string.uuid(),
  description: fake.lorem.sentence(6),
  estimatedSurvivalDays: fake.number.int({min: 0, max: 10}),
  isImportant: fake.datatype.boolean(),
  isSoftDeleted: fake.datatype.boolean(),
  lastUpdatedAt: fake.date.recent(),
  lastUpdatedBy: fake.string.uuid(),
  name: fake.lorem.sentence(5),
  numberOfUpdates: fake.number.int({min: 0, max: 100}),
  photoLocation: "https://cdn.arolariu.ro/fakes/" + fake.lorem.slug(3),
  userIdentifier: fake.string.uuid(),
  items: Array.from({length: fake.number.int({min: 1, max: 30})}, generateFakeInvoiceProduct),
  paymentInformation: {
    currency: {name: fake.finance.currencyName(), symbol: fake.finance.currencySymbol()},
    dateOfPurchase: fake.date.past(),
    totalAmount: fake.number.float({min: 0, max: 1000, multipleOf: 2}),
    totalTax: fake.number.float({min: 0, max: 1000, multipleOf: 2}),
  },
  possibleRecipes: Array.from(
    {length: fake.number.int({min: 0, max: 3})},
    () =>
      ({
        name: fake.lorem.sentence(3),
        complexity: fake.number.int({min: 1, max: 5}),
        observations: [fake.lorem.sentence(5), fake.lorem.sentence(5)],
        recipeIngredients: Array.from({length: fake.number.int({min: 1, max: 10})}, generateFakeInvoiceProduct),
        duration: fake.date.future().toISOString(),
      }) satisfies Recipe,
  ),
  additionalMetadata: Array.from(
    {length: fake.number.int({min: 0, max: 2})},
    () =>
      ({
        [fake.lorem.word(4)]: fake.lorem.sentence(5),
      }) as unknown as Record<string, object>,
  ),
});

const generateFakeMerchant = (): Merchant => ({
  category: MerchantCategory.LOCAL_SHOP,
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

const generateFakeInvoiceProduct = (): Product => ({
  category: fake.number.int({min: 0, max: 13}) as ItemCategory,
  detectedAllergens: [{name: fake.lorem.word()}, {name: fake.lorem.word()}, {name: fake.lorem.word()}],
  genericName: fake.commerce.productName(),
  price: fake.number.float({min: -20, max: 1000, multipleOf: 2}),
  productCode: fake.string.alphanumeric(8),
  quantity: fake.number.int({min: 1, max: 100}),
  rawName: fake.commerce.productName(),
  quantityUnit: fake.commerce.productMaterial(),
  totalPrice: fake.number.float({min: -200, max: 1000, multipleOf: 2}),
  metadata: {
    isComplete: fake.datatype.boolean(),
    isEdited: fake.datatype.boolean(),
    isSoftDeleted: fake.datatype.boolean(),
  },
});

export const FakeInvoice: Invoice = generateFakeInvoice();
export const FakeInvoiceShortList: Invoice[] = Array.from(
  {length: fake.number.int({min: 1, max: 10})},
  generateFakeInvoice,
);
export const FakeInvoiceBigList: Invoice[] = Array.from(
  {length: fake.number.int({min: 10, max: 100})},
  generateFakeInvoice,
);
