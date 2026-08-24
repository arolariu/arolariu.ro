/**
 * @fileoverview Maps EU-14 allergen codes to their next-intl message key paths.
 * @module app/domains/invoices/_components/allergens/allergenLabels
 *
 * @remarks
 * Provides a stable mapping from each canonical {@link AllergenCode} to the
 * full dotted path used with `selectorFromPath` or `t(...)` from next-intl-selector.
 * All 14 keys must exist in the `allergens.codes.*` namespace in every locale file.
 */

import {AllergenCode} from "@/types/invoices/Allergen";

/**
 * Maps each EU-14 allergen code to its fully-qualified next-intl message key path.
 *
 * @remarks
 * Use {@link getAllergenLabelKey} for programmatic access so future key
 * renames only require updating this map, not every call site.
 */
export const ALLERGEN_LABEL_KEYS = {
  [AllergenCode.CerealsContainingGluten]: "allergens.codes.cerealsContainingGluten",
  [AllergenCode.Crustaceans]: "allergens.codes.crustaceans",
  [AllergenCode.Eggs]: "allergens.codes.eggs",
  [AllergenCode.Fish]: "allergens.codes.fish",
  [AllergenCode.Peanuts]: "allergens.codes.peanuts",
  [AllergenCode.Soybeans]: "allergens.codes.soybeans",
  [AllergenCode.Milk]: "allergens.codes.milk",
  [AllergenCode.Nuts]: "allergens.codes.nuts",
  [AllergenCode.Celery]: "allergens.codes.celery",
  [AllergenCode.Mustard]: "allergens.codes.mustard",
  [AllergenCode.Sesame]: "allergens.codes.sesame",
  [AllergenCode.SulphurDioxideAndSulphites]: "allergens.codes.sulphurDioxideAndSulphites",
  [AllergenCode.Lupin]: "allergens.codes.lupin",
  [AllergenCode.Molluscs]: "allergens.codes.molluscs",
} as const satisfies Record<AllergenCode, string>;

/**
 * Returns the fully-qualified next-intl message key path for an EU-14 allergen code.
 *
 * @param code - One of the 14 canonical {@link AllergenCode} values.
 * @returns The dotted message path, e.g. `"allergens.codes.milk"`.
 *
 * @example
 * ```typescript
 * const key = getAllergenLabelKey(AllergenCode.Milk); // "allergens.codes.milk"
 * const label = t(selectorFromPath(key)); // "Milk" / "Lapte" / "Lait"
 * ```
 */
export function getAllergenLabelKey(code: AllergenCode): string {
  return ALLERGEN_LABEL_KEYS[code];
}
