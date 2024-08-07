/** @format */

import type {Allergen} from "@/types/invoices/Allergen";
import Invoice, {type InvoiceCategory} from "@/types/invoices/Invoice";
import Merchant, {type MerchantCategory} from "@/types/invoices/Merchant";
import {PaymentType} from "@/types/invoices/Payment";
import Product, {type ProductCategory} from "@/types/invoices/Product";
import type {Recipe} from "@/types/invoices/Recipe";
import {faker as fake} from "@faker-js/faker";

const generateFakeInvoice = (): Invoice => {
  const invoiceCategory = fake.number.int({min: 1, max: 3}) as InvoiceCategory;
  const products = Array.from({length: fake.number.int({min: 1, max: 30})}, generateFakeInvoiceProduct);
  const totalAmount = products.reduce((acc, product) => acc + product.totalPrice, 0);

  return {
    id: fake.string.uuid(),
    category: invoiceCategory,
    createdAt: fake.date.past(),
    merchant: generateFakeMerchant(),
    createdBy: fake.string.uuid(),
    description: fake.lorem.sentence(7),
    isImportant: fake.datatype.boolean(),
    isSoftDeleted: fake.datatype.boolean(),
    lastUpdatedAt: fake.date.recent(),
    lastUpdatedBy: fake.string.uuid(),
    name: fake.lorem.sentence(3),
    numberOfUpdates: fake.number.int({min: 0, max: 100}),
    photoLocation: "https://cdn.arolariu.ro/fakes/" + fake.lorem.slug(3),
    userIdentifier: fake.string.uuid(),
    items: products,
    paymentInformation: {
      dateOfPurchase: fake.date.past(),
      paymentType: fake.number.int({min: 0, max: 4}) as PaymentType,
      currencyName: fake.finance.currencyName(),
      currencySymbol: fake.finance.currencySymbol(),
      totalAmount: totalAmount,
      totalTax: fake.number.float({min: totalAmount * 0.05, max: totalAmount / 2, multipleOf: 3}),
    },
    possibleRecipes: Array.from(
      {length: fake.number.int({min: 0, max: 3})},
      () =>
        ({
          name: fake.lorem.sentence(3),
          complexity: fake.number.int({min: 1, max: 5}),
          observations: [fake.lorem.sentence(3), fake.lorem.sentence(2)],
          recipeIngredients: [fake.commerce.productName(), fake.commerce.productName()],
          duration: `${fake.number.int({min: 5, max: 120})} minutes`,
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

export const FakeInvoice: Invoice = generateFakeInvoice();
export const FakeInvoiceShortList: Invoice[] = Array.from(
  {length: fake.number.int({min: 1, max: 10})},
  generateFakeInvoice,
);
export const FakeInvoiceBigList: Invoice[] = Array.from(
  {length: fake.number.int({min: 10, max: 100})},
  generateFakeInvoice,
);
