import invoiceData from "@/data/categories/invoices.json";
import merchantData from "@/data/categories/merchants.json";
import productData from "@/data/categories/products.json";
import {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";

/** Entry in a bundled flat category catalog. */
export type CategoryDefinition<TCategory extends number, TKey extends string = string> = Readonly<{
  id: TCategory;
  key: TKey;
  label: string;
}>;

type CatalogKey<TMembers> = Uncapitalize<Extract<keyof TMembers, string>>;
type MerchantCategoryDefinition = CategoryDefinition<MerchantCategory, CatalogKey<typeof MerchantCategory>>;
type InvoiceCategoryDefinition = CategoryDefinition<InvoiceCategory, CatalogKey<typeof InvoiceCategory>>;

/** Product entry with explicit recipe eligibility. */
export type ProductCategoryDefinition = CategoryDefinition<ProductCategory, CatalogKey<typeof ProductCategory>>
  & Readonly<{isFood: boolean}>;

function loadCatalog<TMembers extends Readonly<Record<string, number>>, TEntry extends CategoryDefinition<number>>(
  data: readonly TEntry[],
  members: TMembers,
): readonly (TEntry & CategoryDefinition<TMembers[keyof TMembers], CatalogKey<TMembers>>)[] {
  const keys = new Map(Object.entries(members).map(([key, id]) => [id as number, key[0]?.toLowerCase() + key.slice(1)] as const));
  if (data.length !== 100 || data.length !== keys.size || new Set(data.map(({id}) => id)).size !== keys.size) {
    throw new Error("Incomplete category catalog.");
  }
  return Object.freeze(
    data.map((entry) => {
      if (keys.get(entry.id) !== entry.key || entry.label.trim() === "") throw new Error("Invalid category catalog entry.");
      return Object.freeze({...entry, id: entry.id as TMembers[keyof TMembers], key: entry.key as CatalogKey<TMembers>});
    }),
  );
}

/** All selectable product categories. */
export const productCategories: readonly ProductCategoryDefinition[] = loadCatalog(productData, ProductCategory);
/** All selectable merchant categories. */
export const merchantCategories: readonly MerchantCategoryDefinition[] = loadCatalog(merchantData, MerchantCategory);
/** All selectable invoice categories. */
export const invoiceCategories: readonly InvoiceCategoryDefinition[] = loadCatalog(invoiceData, InvoiceCategory);

function indexCatalog<T extends CategoryDefinition<number>>(entries: readonly T[]): ReadonlyMap<number, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

const products = indexCatalog(productCategories);
const merchants = indexCatalog(merchantCategories);
const invoices = indexCatalog(invoiceCategories);

/** Tests whether the value is a product category ID. */
export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "number" && products.has(value);
}

/** Tests whether the value is a merchant category ID. */
export function isMerchantCategory(value: unknown): value is MerchantCategory {
  return typeof value === "number" && merchants.has(value);
}

/** Tests whether the value is an invoice category ID. */
export function isInvoiceCategory(value: unknown): value is InvoiceCategory {
  return typeof value === "number" && invoices.has(value);
}

function getEntry<T>(index: ReadonlyMap<number, T>, id: number): T {
  const entry = index.get(id);
  if (entry === undefined) throw new RangeError(`Unknown category ID: ${id}`);
  return entry;
}

/** Looks up a product category in the bundled catalog. */
export function getProductCategory(id: ProductCategory): ProductCategoryDefinition {
  return getEntry(products, id);
}

/** Looks up a merchant category in the bundled catalog. */
export function getMerchantCategory(id: MerchantCategory): MerchantCategoryDefinition {
  return getEntry(merchants, id);
}

/** Looks up an invoice category in the bundled catalog. */
export function getInvoiceCategory(id: InvoiceCategory): InvoiceCategoryDefinition {
  return getEntry(invoices, id);
}

/** Returns whether a known product category is eligible for recipes. */
export function isFoodProductCategory(id: ProductCategory | null): boolean {
  return id !== null && getProductCategory(id).isFood;
}
