# arolariu.ro Website Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `sites/arolariu.ro` by aligning its TypeScript strictness with the repo root, adding ambient typings for `*.css` / `*.scss` imports, migrating the 10 backend-mirrored enums to erasable const-object pattern, wiring the already-defined `Errors.*` i18n namespace into real `error.tsx` + `not-found.tsx` boundaries (none exist today), and confirming the 90% coverage thresholds are enforced. All type-checking uses TSGO (`@typescript/native-preview`) for ≈10× faster feedback than `tsc`.

**Architecture:** Four atomic workstreams, executed in order:
1. **TypeScript strictness** — install TSGO, add one `.d.ts` shim, then delete three strictness regressions from `sites/arolariu.ro/tsconfig.json`. Because the codebase has 10 `enum` declarations used everywhere, the `erasableSyntaxOnly` rollback is preceded by a per-file enum-to-const-object migration (Pattern documented in Task 4).
2. **Route boundaries** — a root `error.tsx` and root `not-found.tsx` (leveraging `experimental.globalNotFound: true` already set in `next.config.ts`) consume the existing `Errors.globalError.*` and `Errors.notFound.*` keys. Domain-scoped `error.tsx` files provide narrower recovery paths for `/domains`, `/auth`, `/about`, `/my-profile`. Dynamic `[id]` routes gain `not-found.tsx` plus `notFound()` wiring in the paired `page.tsx` for backend 404s specifically — 403 / 500 / network failures continue to fall through to `<RenderForbiddenScreen />`.
3. **i18n reuse** — no new translation keys added; the existing well-populated `Errors.globalError` and `Errors.notFound` namespaces are consumed as-is.
4. **Coverage verification** — confirm the root `vitest.config.ts` thresholds (90% branches / functions / lines / statements) propagate through `mergeConfig` into the site's test run.

**Tech Stack:**
- Next.js 16.2 (App Router, RSC + Island Pattern), React 19.2.4.
- TypeScript 5 (root config: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`).
- **TSGO** — the Go port of `tsc`, assumed available on the `PATH` (invoked as `tsgo`). No `devDependency` is added. If a subagent reports `tsgo: command not found`, fall back to `npx tsc --noEmit -p tsconfig.json` for that step and flag the environment gap.
- Vitest 3 + happy-dom + `@testing-library/react` + `@testing-library/jest-dom`.
- `next-intl` (mocked in tests to return raw keys via `vitest.setup.ts:54-63`).
- Existing `instrumentation.server.ts` helpers (not reached from client boundaries).

**Scope guards:**
- No new dependencies — runtime or dev (no zod, no tracking SDK, no tsgo devDep).
- No changes to behavior of successful paths.
- No refactoring of components on the basis of line count.
- Each task must end with a commit.

---

## File Structure

**New files (13 total):**

- `sites/arolariu.ro/src/types/assets.d.ts` — ambient declarations for `*.css`, `*.scss`, `*.module.css`, `*.module.scss`.
- `sites/arolariu.ro/src/app/error.tsx` + `error.test.tsx` — root client error boundary.
- `sites/arolariu.ro/src/app/not-found.tsx` + `not-found.test.tsx` — root 404 page.
- `sites/arolariu.ro/src/app/domains/error.tsx` — domain-scoped boundary.
- `sites/arolariu.ro/src/app/auth/error.tsx` — auth-scoped boundary.
- `sites/arolariu.ro/src/app/about/error.tsx` — about-scoped boundary.
- `sites/arolariu.ro/src/app/my-profile/error.tsx` — profile-scoped boundary.
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx` + `not-found.test.tsx`.
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.tsx` + `not-found.test.tsx`.

**Modified files (14 total):**

- `sites/arolariu.ro/tsconfig.json` — remove 3 strictness overrides across Tasks 3, 4.13, 5.
- `sites/arolariu.ro/src/app/layout.tsx:14,17` — remove the two `@ts-ignore` comments (Task 2).
- `sites/arolariu.ro/src/types/scans/Scan.ts` — migrate `ScanType` + `ScanStatus` enums (Task 4).
- `sites/arolariu.ro/src/types/invoices/Invoice.ts` — migrate `InvoiceAnalysisOptions` + `InvoiceScanType` + `InvoiceCategory` enums (Task 4).
- `sites/arolariu.ro/src/types/invoices/Merchant.ts` — migrate `MerchantCategory` enum (Task 4).
- `sites/arolariu.ro/src/types/invoices/Payment.ts` — migrate `PaymentType` enum (Task 4).
- `sites/arolariu.ro/src/types/invoices/Product.ts` — migrate `ProductCategory` enum (Task 4).
- `sites/arolariu.ro/src/types/invoices/Recipe.ts` — migrate `RecipeComplexity` enum (Task 4).
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_types/timeline.ts` — migrate `TimelineEventType` enum (Task 4).
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx` — add backend-404 → `notFound()` branch (Task 14).
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx` — add backend-404 → `notFound()` branch (Task 15).
- `sites/arolariu.ro/vitest.config.ts` — no change expected; Task 16 only verifies merged thresholds (or re-declares them if the merge is dropping them).

---

## Task 1: Ambient type declarations for style imports

**Files:**
- Create: `sites/arolariu.ro/src/types/assets.d.ts`

**Before:** `.css` / `.scss` imports require `@ts-ignore` comments to suppress "module has no typings" errors.

**After:** Any file in the project can `import "./foo.scss"` or `import styles from "./x.module.scss"` without TypeScript complaints.

- [ ] **Step 1.1: Create the ambient declaration file**

Create `sites/arolariu.ro/src/types/assets.d.ts`:

```ts
// Ambient declarations for style imports. Lets TypeScript accept
// side-effect imports (`import "./globals.scss"`) and CSS-Modules imports
// (`import styles from "./x.module.scss"`) without `@ts-ignore`.

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
```

- [ ] **Step 1.2: Type-check to confirm the file is picked up**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0. The shim is inclusive — it only grants more, never takes away.

- [ ] **Step 1.3: Commit**

```bash
git add sites/arolariu.ro/src/types/assets.d.ts
git commit -m "chore(website): add ambient declarations for CSS/SCSS imports"
```

---

## Task 2: Remove `@ts-ignore` comments from root layout

**Files:**
- Modify: `sites/arolariu.ro/src/app/layout.tsx:14,17`

**Before (`sites/arolariu.ro/src/app/layout.tsx:14–18`):**

```tsx
// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";
```

**After:**

```tsx
import "@arolariu/components/styles.css";

import "./globals.scss";
```

- [ ] **Step 2.1: Apply the diff**

Open `sites/arolariu.ro/src/app/layout.tsx`, delete the two `@ts-ignore` comment lines (and the blank helper line that immediately precedes each). The two import statements remain.

- [ ] **Step 2.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0. The shim from Task 1 now carries these imports.

- [ ] **Step 2.3: Commit**

```bash
git add sites/arolariu.ro/src/app/layout.tsx
git commit -m "chore(website): drop @ts-ignore on style imports now typed by assets.d.ts"
```

---

## Task 3: Drop `allowArbitraryExtensions: true` override

**Files:**
- Modify: `sites/arolariu.ro/tsconfig.json`

**Why this goes first among the strictness rollbacks:** the root sets `allowArbitraryExtensions: false`. The site's `true` override was almost certainly a workaround for the `@ts-ignore` comments we just deleted. Removing it now proves Task 1 was sufficient.

**Before (`sites/arolariu.ro/tsconfig.json:4–8`):**

```json
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "allowArbitraryExtensions": true,
    "erasableSyntaxOnly": false,
    "paths": {
      "@/*": ["./src/*"]
    },
```

**After:**

```json
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "erasableSyntaxOnly": false,
    "paths": {
      "@/*": ["./src/*"]
    },
```

- [ ] **Step 3.1: Apply the diff**

Delete the `"allowArbitraryExtensions": true,` line from `sites/arolariu.ro/tsconfig.json`.

- [ ] **Step 3.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0. Any failure here means an asset import is reaching past `.css` / `.scss`. If that happens, identify the extension from the error message and extend `src/types/assets.d.ts` with a matching `declare module "*.<ext>"` block; re-run until clean.

- [ ] **Step 3.3: Commit**

```bash
git add sites/arolariu.ro/tsconfig.json
git commit -m "chore(website): inherit allowArbitraryExtensions=false from root tsconfig"
```

---

## Task 4: Migrate 10 enums to erasable const-object pattern, then drop `erasableSyntaxOnly: false`

**Files:**
- Modify: `sites/arolariu.ro/src/types/scans/Scan.ts` (2 enums)
- Modify: `sites/arolariu.ro/src/types/invoices/Invoice.ts` (3 enums)
- Modify: `sites/arolariu.ro/src/types/invoices/Merchant.ts` (1 enum)
- Modify: `sites/arolariu.ro/src/types/invoices/Payment.ts` (1 enum)
- Modify: `sites/arolariu.ro/src/types/invoices/Product.ts` (1 enum)
- Modify: `sites/arolariu.ro/src/types/invoices/Recipe.ts` (1 enum)
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_types/timeline.ts` (1 enum)
- Modify: `sites/arolariu.ro/tsconfig.json` (after all migrations)

**Background:** `erasableSyntaxOnly: true` (root default) forbids TypeScript syntax that emits JavaScript — notably `enum`. The site's 10 enums mirror backend-issued numeric and string codes, so we keep their values and switch to an erasable pattern.

**The Pattern (apply it consistently):**

```ts
// BEFORE — TypeScript enum (non-erasable)
export enum Foo {
  Bar = 0,
  Baz = 1,
}

// AFTER — const object + typeof-keyof type (erasable)
export const Foo = {
  Bar: 0,
  Baz: 1,
} as const;
export type Foo = (typeof Foo)[keyof typeof Foo];
```

Consumers that do `Foo.Bar`, `x === Foo.Bar`, `Object.values(Foo)`, `switch (x) { case Foo.Bar: }`, and `const y: Foo = Foo.Bar` all continue to work. The only consumer pattern that breaks is **reverse numeric lookup** (e.g., `Foo[0]` returning `"Bar"`), which is rarely used — Step 4.1 greps for it explicitly.

- [ ] **Step 4.1: Grep for reverse-lookup usages (potential breakage)**

```bash
cd sites/arolariu.ro && grep -rnE "(ScanType|ScanStatus|RecipeComplexity|ProductCategory|PaymentType|MerchantCategory|InvoiceAnalysisOptions|InvoiceScanType|InvoiceCategory|TimelineEventType)\[" src --include='*.ts' --include='*.tsx'
```

Expected: either empty output (no reverse lookups — proceed) or a short list of call sites. For each hit:
- If it's an enum-reverse-lookup like `ScanType[0]`, record the file + line; after migration, rewrite it to `Object.keys(ScanType).find(k => ScanType[k as keyof typeof ScanType] === 0) ?? "UNKNOWN"` or (preferred) introduce an inverse map.
- If it's an index access like `invoice[ScanType.JPEG]` (entirely different — key-into-another-object), it is unaffected; skip.

- [ ] **Step 4.2: Migrate `ScanType` (string enum with identity values)**

In `sites/arolariu.ro/src/types/scans/Scan.ts`, replace lines 46–55:

```ts
// BEFORE
export enum ScanType {
  /** JPEG image format */
  JPEG = "JPEG",
  /** PNG image format */
  PNG = "PNG",
  /** PDF document format */
  PDF = "PDF",
  /** Other or unsupported format */
  OTHER = "OTHER",
}

// AFTER
export const ScanType = {
  /** JPEG image format */
  JPEG: "JPEG",
  /** PNG image format */
  PNG: "PNG",
  /** PDF document format */
  PDF: "PDF",
  /** Other or unsupported format */
  OTHER: "OTHER",
} as const;
export type ScanType = (typeof ScanType)[keyof typeof ScanType];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.3: Migrate `ScanStatus` (string enum with lowercase values)**

In `sites/arolariu.ro/src/types/scans/Scan.ts`, replace lines 84–95:

```ts
// BEFORE
export enum ScanStatus {
  /** Upload in progress */
  UPLOADING = "uploading",
  /** Uploaded to Azure, available for use */
  READY = "ready",
  /** Upload failed */
  FAILED = "failed",
  /** Being used to create an invoice */
  PROCESSING = "processing",
  /** Invoice created, scan archived */
  ARCHIVED = "archived",
}

// AFTER
export const ScanStatus = {
  /** Upload in progress */
  UPLOADING: "uploading",
  /** Uploaded to Azure, available for use */
  READY: "ready",
  /** Upload failed */
  FAILED: "failed",
  /** Being used to create an invoice */
  PROCESSING: "processing",
  /** Invoice created, scan archived */
  ARCHIVED: "archived",
} as const;
export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.4: Migrate `InvoiceAnalysisOptions` (numeric enum with implicit values)**

In `sites/arolariu.ro/src/types/invoices/Invoice.ts`, replace lines 55–66. **Note:** the original uses implicit values (0, 1, 2, 3, 4). The migration must make the values explicit to preserve the protocol contract.

```ts
// BEFORE
export enum InvoiceAnalysisOptions {
  /** No analysis will be performed on the invoice. */
  NoAnalysis,
  /** Full analysis will be performed on the invoice. */
  CompleteAnalysis,
  /** Only the invoice data will be analyzed. */
  InvoiceOnly,
  /** Only the items on the invoice will be analyzed. */
  InvoiceItemsOnly,
  /** Only the merchant information will be analyzed. */
  InvoiceMerchantOnly,
}

// AFTER
export const InvoiceAnalysisOptions = {
  /** No analysis will be performed on the invoice. */
  NoAnalysis: 0,
  /** Full analysis will be performed on the invoice. */
  CompleteAnalysis: 1,
  /** Only the invoice data will be analyzed. */
  InvoiceOnly: 2,
  /** Only the items on the invoice will be analyzed. */
  InvoiceItemsOnly: 3,
  /** Only the merchant information will be analyzed. */
  InvoiceMerchantOnly: 4,
} as const;
export type InvoiceAnalysisOptions = (typeof InvoiceAnalysisOptions)[keyof typeof InvoiceAnalysisOptions];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.5: Migrate `InvoiceScanType` (numeric enum with implicit values)**

In `sites/arolariu.ro/src/types/invoices/Invoice.ts`, replace lines 96–109:

```ts
// BEFORE
export enum InvoiceScanType {
  /** JPEG image format */
  JPG,
  /** JPEG image format */
  JPEG,
  /** PNG image format */
  PNG,
  /** PDF document format */
  PDF,
  /**  Other image format */
  OTHER,
  /** Unknown or unsupported format */
  UNKNOWN,
}

// AFTER
export const InvoiceScanType = {
  /** JPG image format */
  JPG: 0,
  /** JPEG image format */
  JPEG: 1,
  /** PNG image format */
  PNG: 2,
  /** PDF document format */
  PDF: 3,
  /** Other image format */
  OTHER: 4,
  /** Unknown or unsupported format */
  UNKNOWN: 5,
} as const;
export type InvoiceScanType = (typeof InvoiceScanType)[keyof typeof InvoiceScanType];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.6: Migrate `InvoiceCategory` (numeric enum with gapped values)**

In `sites/arolariu.ro/src/types/invoices/Invoice.ts`, replace lines 145–158:

```ts
// BEFORE
export enum InvoiceCategory {
  /** Not defined category */
  NOT_DEFINED = 0,
  /** Grocery category */
  GROCERY = 100,
  /** Fast food category */
  FAST_FOOD = 200,
  /** Home cleaning category */
  HOME_CLEANING = 300,
  /** Car and auto category */
  CAR_AUTO = 400,
  /** Other category */
  OTHER = 9999,
}

// AFTER
export const InvoiceCategory = {
  /** Not defined category */
  NOT_DEFINED: 0,
  /** Grocery category */
  GROCERY: 100,
  /** Fast food category */
  FAST_FOOD: 200,
  /** Home cleaning category */
  HOME_CLEANING: 300,
  /** Car and auto category */
  CAR_AUTO: 400,
  /** Other category */
  OTHER: 9999,
} as const;
export type InvoiceCategory = (typeof InvoiceCategory)[keyof typeof InvoiceCategory];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.7: Migrate `MerchantCategory` (numeric enum with gapped values)**

In `sites/arolariu.ro/src/types/invoices/Merchant.ts`, replace lines 55–62:

```ts
// BEFORE
export enum MerchantCategory {
  NOT_DEFINED = 0,
  LOCAL_SHOP = 100,
  SUPERMARKET = 200,
  HYPERMARKET = 300,
  ONLINE_SHOP = 400,
  OTHER = 9999,
}

// AFTER
export const MerchantCategory = {
  NOT_DEFINED: 0,
  LOCAL_SHOP: 100,
  SUPERMARKET: 200,
  HYPERMARKET: 300,
  ONLINE_SHOP: 400,
  OTHER: 9999,
} as const;
export type MerchantCategory = (typeof MerchantCategory)[keyof typeof MerchantCategory];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.8: Migrate `PaymentType` (numeric enum with gapped values, PascalCase keys)**

In `sites/arolariu.ro/src/types/invoices/Payment.ts`, replace lines 57–65:

```ts
// BEFORE
export enum PaymentType {
  Unknown = 0,
  Cash = 100,
  Card = 200,
  Transfer = 300,
  MobilePayment = 400,
  Voucher = 500,
  Other = 9999,
}

// AFTER
export const PaymentType = {
  Unknown: 0,
  Cash: 100,
  Card: 200,
  Transfer: 300,
  MobilePayment: 400,
  Voucher: 500,
  Other: 9999,
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.9: Migrate `ProductCategory` (numeric enum with gapped values)**

In `sites/arolariu.ro/src/types/invoices/Product.ts`, replace lines 111–127:

```ts
// BEFORE
export enum ProductCategory {
  NOT_DEFINED = 0,
  BAKED_GOODS = 100,
  GROCERIES = 200,
  DAIRY = 300,
  MEAT = 400,
  FISH = 500,
  FRUITS = 600,
  VEGETABLES = 700,
  BEVERAGES = 800,
  ALCOHOLIC_BEVERAGES = 900,
  TOBACCO = 1000,
  CLEANING_SUPPLIES = 1100,
  PERSONAL_CARE = 1200,
  MEDICINE = 1300,
  OTHER = 9999,
}

// AFTER
export const ProductCategory = {
  NOT_DEFINED: 0,
  BAKED_GOODS: 100,
  GROCERIES: 200,
  DAIRY: 300,
  MEAT: 400,
  FISH: 500,
  FRUITS: 600,
  VEGETABLES: 700,
  BEVERAGES: 800,
  ALCOHOLIC_BEVERAGES: 900,
  TOBACCO: 1000,
  CLEANING_SUPPLIES: 1100,
  PERSONAL_CARE: 1200,
  MEDICINE: 1300,
  OTHER: 9999,
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.10: Migrate `RecipeComplexity` (numeric enum, contiguous values)**

In `sites/arolariu.ro/src/types/invoices/Recipe.ts`, replace lines 57–69:

```ts
// BEFORE
export enum RecipeComplexity {
  /** Unknown complexity */
  Unknown = 0,

  /** Easy complexity */
  Easy = 1,

  /** Normal complexity */
  Normal = 2,

  /** Hard complexity */
  Hard = 3,
}

// AFTER
export const RecipeComplexity = {
  /** Unknown complexity */
  Unknown: 0,
  /** Easy complexity */
  Easy: 1,
  /** Normal complexity */
  Normal: 2,
  /** Hard complexity */
  Hard: 3,
} as const;
export type RecipeComplexity = (typeof RecipeComplexity)[keyof typeof RecipeComplexity];
```

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.11: Migrate `TimelineEventType` (string enum with lowercase values)**

In `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_types/timeline.ts`, replace lines 54 onward. Preserve every key and string value from the original:

```ts
// BEFORE
export enum TimelineEventType {
  CREATED = "created",
  AI_ANALYSIS = "ai_analysis",
  RECIPES_GENERATED = "recipes_generated",
  SHARED = "shared",
  EDITED = "edited",
  EXPORTED = "exported",
  MARKED_IMPORTANT = "marked_important",
  // ...(any additional keys present in the file)
}

// AFTER
export const TimelineEventType = {
  CREATED: "created",
  AI_ANALYSIS: "ai_analysis",
  RECIPES_GENERATED: "recipes_generated",
  SHARED: "shared",
  EDITED: "edited",
  EXPORTED: "exported",
  MARKED_IMPORTANT: "marked_important",
  // ...(mirror every remaining key from the BEFORE block)
} as const;
export type TimelineEventType = (typeof TimelineEventType)[keyof typeof TimelineEventType];
```

Read the full BEFORE list before writing AFTER — the original file may have keys past line 69 that weren't shown here. Every key and every string value must round-trip.

Type-check: `cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json` — expect exit 0.

- [ ] **Step 4.12: Run unit tests to catch any consumer surprise**

```bash
cd sites/arolariu.ro && npm run test:unit
```

Expected: all tests pass. If a test that used a reverse lookup or an iteration pattern fails, fix that test per the guidance in Step 4.1.

- [ ] **Step 4.13: Drop the `erasableSyntaxOnly: false` override from `tsconfig.json`**

**Before (`sites/arolariu.ro/tsconfig.json:4–7` after Task 3):**

```json
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "erasableSyntaxOnly": false,
    "paths": {
```

**After:**

```json
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "paths": {
```

Delete the `"erasableSyntaxOnly": false,` line.

- [ ] **Step 4.14: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0. Any remaining `enum` declaration anywhere in the site will now surface as a diagnostic. If one does, it was missed in Steps 4.2–4.11 — migrate it with the same Pattern and re-run.

- [ ] **Step 4.15: Run the build to confirm no runtime code paths broke**

```bash
cd sites/arolariu.ro && npm run build
```

Expected: a clean build. A failure here means the migration changed runtime semantics (very unlikely with the erasable Pattern, but worth confirming).

- [ ] **Step 4.16: Commit**

```bash
git add sites/arolariu.ro/tsconfig.json \
        sites/arolariu.ro/src/types/scans/Scan.ts \
        sites/arolariu.ro/src/types/invoices/Invoice.ts \
        sites/arolariu.ro/src/types/invoices/Merchant.ts \
        sites/arolariu.ro/src/types/invoices/Payment.ts \
        sites/arolariu.ro/src/types/invoices/Product.ts \
        sites/arolariu.ro/src/types/invoices/Recipe.ts \
        sites/arolariu.ro/src/app/domains/invoices/view-invoice/\[id\]/_types/timeline.ts
git commit -m "refactor(website): migrate enums to erasable const-object pattern; inherit erasableSyntaxOnly=true"
```

---

## Task 5: Drop `exactOptionalPropertyTypes: false` override

**Files:**
- Modify: `sites/arolariu.ro/tsconfig.json`

**Background:** The root enables `exactOptionalPropertyTypes: true`. This forbids `{ foo: undefined }` being assigned to `{ foo?: string }` — the optional mark means "may be absent", not "may be `undefined`". It typically surfaces 10–50 errors in a mid-sized codebase.

**Abort condition:** if the initial error count after 5.1 exceeds **60**, stop, commit nothing, and file a follow-up plan. Beyond that threshold, batching violates the 2–5-minute-step rule.

**Before (`sites/arolariu.ro/tsconfig.json:4–6` after Tasks 3, 4):**

```json
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "paths": {
```

**After:**

```json
  "compilerOptions": {
    "paths": {
```

- [ ] **Step 5.1: Apply the diff**

Delete the `"exactOptionalPropertyTypes": false,` line from `sites/arolariu.ro/tsconfig.json`.

- [ ] **Step 5.2: Capture the full error set**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json 2>&1 | tee /tmp/eopt-errors.log
grep -c "error TS" /tmp/eopt-errors.log
```

Expected: a single integer (error count). Decide:
- `< 60` → continue to 5.3.
- `>= 60` → stop, revert `tsconfig.json` with `git checkout -- sites/arolariu.ro/tsconfig.json`, file a follow-up plan titled `2026-04-MM-exact-optional-property-types-migration.md`, skip the rest of Task 5.

- [ ] **Step 5.3: Apply one of three fix patterns per error**

For each error in `/tmp/eopt-errors.log`, identify which pattern applies.

**Pattern A — widen the property type when `undefined` is a valid stored value:**

```ts
// BEFORE
const payload: { name?: string } = { name: maybe ?? undefined };

// AFTER — widened to accept explicit undefined
const payload: { name?: string | undefined } = { name: maybe ?? undefined };
```

Use when the key being present with `undefined` is semantically distinct from "key absent" (e.g., clearing a previously set form field).

**Pattern B — conditional spread so the key is only present when defined:**

```ts
// BEFORE
const payload: { name?: string } = { name: maybe ?? undefined };

// AFTER
const payload: { name?: string } = { ...(maybe !== undefined && { name: maybe }) };
```

Use when "key absent" and "key undefined" are equivalent (most API payloads).

**Pattern C — narrow at the use site:**

```ts
// BEFORE
function setName(x: { name?: string }, n: string | undefined) {
  x.name = n;
}

// AFTER
function setName(x: { name?: string }, n: string | undefined) {
  if (n === undefined) delete x.name;
  else x.name = n;
}
```

Use when you must mutate an existing object and cannot swap to spread.

**Heuristic:**
- Server action payloads and request bodies → Pattern B (cleanest wire contract).
- Form state that preserves a "user cleared this field" flag → Pattern A.
- In-place mutation of Zustand state or DOM-adjacent objects → Pattern C.

- [ ] **Step 5.4: Re-check after every 5–10 fixes**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json 2>&1 | tail -20
```

This keeps the feedback loop tight — smaller batches make regressions easy to isolate.

- [ ] **Step 5.5: Type-check is clean**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 5.6: Run unit tests**

```bash
cd sites/arolariu.ro && npm run test:unit
```

Expected: all tests pass. A failure means a Pattern-B or Pattern-C substitution changed runtime behavior (e.g., caller now sees a missing key where it expected `undefined`) — revert that specific file and apply Pattern A instead.

- [ ] **Step 5.7: Commit**

```bash
git add sites/arolariu.ro/tsconfig.json sites/arolariu.ro/src
git commit -m "chore(website): inherit exactOptionalPropertyTypes=true from root tsconfig"
```

---

## Task 6: Root `app/error.tsx` with test

**Files:**
- Create: `sites/arolariu.ro/src/app/error.tsx`
- Create: `sites/arolariu.ro/src/app/error.test.tsx`

**Why now (not earlier):** Under the laxer tsconfig that existed through Task 5, the component would have been written under weaker type rules. Writing it after Task 5 means the tsconfig it's checked against is already final — no backtracking.

**What the component provides:**

```
┌──────────────────────────────────────┐
│  Errors.globalError.hero.title       │   ← h1
│  Errors.globalError.hero.subtitle    │   ← p
│  Errors.globalError.details.         │
│    errorIdLabel  <abc123>            │   ← conditional on digest
│  [ Errors.globalError.buttons.       │
│      tryAgain ]                       │   ← button → reset()
└──────────────────────────────────────┘
```

- [ ] **Step 6.1: Write the failing test**

Create `sites/arolariu.ro/src/app/error.test.tsx`:

```tsx
import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import GlobalError from "./error";

describe("app/error.tsx", () => {
  it("renders the hero title and subtitle keys", () => {
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByText("Errors.globalError.hero.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.globalError.hero.subtitle")).toBeInTheDocument();
  });

  it("calls reset when the try-again button is clicked", () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", {name: "Errors.globalError.buttons.tryAgain"}));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("exposes the error digest when present", () => {
    const err = Object.assign(new Error("boom"), {digest: "abc123"});
    render(<GlobalError error={err} reset={vi.fn()} />);
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("logs the error to console.error on mount", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith("[app/error.tsx]", expect.any(Error));
    spy.mockRestore();
  });
});
```

- [ ] **Step 6.2: Run the test and confirm it fails**

```bash
cd sites/arolariu.ro && npx vitest run src/app/error.test.tsx
```

Expected: **FAIL** with `Cannot find module './error'`.

- [ ] **Step 6.3: Write the minimal implementation**

Create `sites/arolariu.ro/src/app/error.tsx`:

```tsx
"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type GlobalErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function GlobalError({error, reset}: GlobalErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <section role="alert" aria-live="assertive">
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button type="button" onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
```

- [ ] **Step 6.4: Run the test again and confirm it passes**

```bash
cd sites/arolariu.ro && npx vitest run src/app/error.test.tsx
```

Expected: **PASS** (4 tests).

- [ ] **Step 6.5: Commit**

```bash
git add sites/arolariu.ro/src/app/error.tsx sites/arolariu.ro/src/app/error.test.tsx
git commit -m "feat(website): add root error boundary wired to Errors.globalError i18n"
```

---

## Task 7: Root `app/not-found.tsx` with test

**Files:**
- Create: `sites/arolariu.ro/src/app/not-found.tsx`
- Create: `sites/arolariu.ro/src/app/not-found.test.tsx`

**Background:** `next.config.ts:169` has `experimental.globalNotFound: true`, so this file becomes the global 404 — including for `notFound()` invocations in RSC pages with no nearer boundary.

- [ ] **Step 7.1: Write the failing test**

Create `sites/arolariu.ro/src/app/not-found.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import NotFound from "./not-found";

describe("app/not-found.tsx", () => {
  it("renders the 404 title and subtitle keys", () => {
    render(<NotFound />);
    expect(screen.getByText("Errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", {name: "Errors.notFound.buttons.returnButton"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 7.2: Run the test and confirm it fails**

```bash
cd sites/arolariu.ro && npx vitest run src/app/not-found.test.tsx
```

Expected: **FAIL** with `Cannot find module './not-found'`.

- [ ] **Step 7.3: Write the minimal implementation**

Create `sites/arolariu.ro/src/app/not-found.tsx`:

```tsx
import {useTranslations} from "next-intl";
import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  const t = useTranslations("Errors.notFound");
  return (
    <section>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <Link href="/">{t("buttons.returnButton")}</Link>
    </section>
  );
}
```

- [ ] **Step 7.4: Run the test and confirm it passes**

```bash
cd sites/arolariu.ro && npx vitest run src/app/not-found.test.tsx
```

Expected: **PASS** (2 tests).

- [ ] **Step 7.5: Commit**

```bash
git add sites/arolariu.ro/src/app/not-found.tsx sites/arolariu.ro/src/app/not-found.test.tsx
git commit -m "feat(website): add root not-found page wired to Errors.notFound i18n"
```

---

## Task 8: Domain-scoped error boundary for `/domains`

**Files:**
- Create: `sites/arolariu.ro/src/app/domains/error.tsx`

**Pattern:** Scoped boundaries reuse the same `Errors.globalError.*` keys but carry a `data-scope` attribute so observability dashboards can filter. No new i18n keys.

- [ ] **Step 8.1: Create the file**

Create `sites/arolariu.ro/src/app/domains/error.tsx`:

```tsx
"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type DomainsErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function DomainsError({error, reset}: DomainsErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/domains/error.tsx]", error);
  }, [error]);

  return (
    <section role="alert" aria-live="assertive" data-scope="domains">
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button type="button" onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
```

- [ ] **Step 8.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 8.3: Commit**

```bash
git add sites/arolariu.ro/src/app/domains/error.tsx
git commit -m "feat(website): add domains-scoped error boundary"
```

---

## Task 9: Auth-scoped error boundary for `/auth`

**Files:**
- Create: `sites/arolariu.ro/src/app/auth/error.tsx`

- [ ] **Step 9.1: Create the file**

Create `sites/arolariu.ro/src/app/auth/error.tsx`:

```tsx
"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type AuthErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AuthError({error, reset}: AuthErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/auth/error.tsx]", error);
  }, [error]);

  return (
    <section role="alert" aria-live="assertive" data-scope="auth">
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button type="button" onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
```

- [ ] **Step 9.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 9.3: Commit**

```bash
git add sites/arolariu.ro/src/app/auth/error.tsx
git commit -m "feat(website): add auth-scoped error boundary"
```

---

## Task 10: About-scoped error boundary for `/about`

**Files:**
- Create: `sites/arolariu.ro/src/app/about/error.tsx`

- [ ] **Step 10.1: Create the file**

Create `sites/arolariu.ro/src/app/about/error.tsx`:

```tsx
"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type AboutErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AboutError({error, reset}: AboutErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/about/error.tsx]", error);
  }, [error]);

  return (
    <section role="alert" aria-live="assertive" data-scope="about">
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button type="button" onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
```

- [ ] **Step 10.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 10.3: Commit**

```bash
git add sites/arolariu.ro/src/app/about/error.tsx
git commit -m "feat(website): add about-scoped error boundary"
```

---

## Task 11: Profile-scoped error boundary for `/my-profile`

**Files:**
- Create: `sites/arolariu.ro/src/app/my-profile/error.tsx`

- [ ] **Step 11.1: Create the file**

Create `sites/arolariu.ro/src/app/my-profile/error.tsx`:

```tsx
"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type ProfileErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function ProfileError({error, reset}: ProfileErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/my-profile/error.tsx]", error);
  }, [error]);

  return (
    <section role="alert" aria-live="assertive" data-scope="my-profile">
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button type="button" onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
```

- [ ] **Step 11.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 11.3: Commit**

```bash
git add sites/arolariu.ro/src/app/my-profile/error.tsx
git commit -m "feat(website): add profile-scoped error boundary"
```

---

## Task 12: `not-found.tsx` for view-invoice dynamic route

**Files:**
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx`

- [ ] **Step 12.1: Write the failing test**

Create `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import InvoiceNotFound from "./not-found";

describe("view-invoice/[id]/not-found.tsx", () => {
  it("renders the invoice-scoped not-found message", () => {
    render(<InvoiceNotFound />);
    expect(screen.getByText("Errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("links back to the invoices listing", () => {
    render(<InvoiceNotFound />);
    const link = screen.getByRole("link", {name: "Errors.notFound.buttons.returnButton"});
    expect(link).toHaveAttribute("href", "/domains/invoices/view-invoices");
  });
});
```

- [ ] **Step 12.2: Run the test and confirm it fails**

```bash
cd sites/arolariu.ro && npx vitest run "src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx"
```

Expected: **FAIL** with `Cannot find module './not-found'`.

- [ ] **Step 12.3: Write the minimal implementation**

Create `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx`:

```tsx
import {useTranslations} from "next-intl";
import Link from "next/link";

export default function InvoiceNotFound(): React.JSX.Element {
  const t = useTranslations("Errors.notFound");
  return (
    <section data-scope="view-invoice">
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <Link href="/domains/invoices/view-invoices">{t("buttons.returnButton")}</Link>
    </section>
  );
}
```

- [ ] **Step 12.4: Run the test and confirm it passes**

```bash
cd sites/arolariu.ro && npx vitest run "src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx"
```

Expected: **PASS** (2 tests).

- [ ] **Step 12.5: Commit**

```bash
git add "sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx" \
        "sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx"
git commit -m "feat(website): add view-invoice not-found boundary"
```

---

## Task 13: `not-found.tsx` for edit-invoice dynamic route

**Files:**
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.test.tsx`

- [ ] **Step 13.1: Write the failing test**

Create `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import InvoiceNotFound from "./not-found";

describe("edit-invoice/[id]/not-found.tsx", () => {
  it("renders the invoice-scoped not-found message", () => {
    render(<InvoiceNotFound />);
    expect(screen.getByText("Errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("links back to the invoices listing", () => {
    render(<InvoiceNotFound />);
    const link = screen.getByRole("link", {name: "Errors.notFound.buttons.returnButton"});
    expect(link).toHaveAttribute("href", "/domains/invoices/view-invoices");
  });
});
```

- [ ] **Step 13.2: Run the test and confirm it fails**

```bash
cd sites/arolariu.ro && npx vitest run "src/app/domains/invoices/edit-invoice/[id]/not-found.test.tsx"
```

Expected: **FAIL** with `Cannot find module './not-found'`.

- [ ] **Step 13.3: Write the minimal implementation**

Create `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.tsx`:

```tsx
import {useTranslations} from "next-intl";
import Link from "next/link";

export default function InvoiceNotFound(): React.JSX.Element {
  const t = useTranslations("Errors.notFound");
  return (
    <section data-scope="edit-invoice">
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <Link href="/domains/invoices/view-invoices">{t("buttons.returnButton")}</Link>
    </section>
  );
}
```

- [ ] **Step 13.4: Run the test and confirm it passes**

```bash
cd sites/arolariu.ro && npx vitest run "src/app/domains/invoices/edit-invoice/[id]/not-found.test.tsx"
```

Expected: **PASS** (2 tests).

- [ ] **Step 13.5: Commit**

```bash
git add "sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.tsx" \
        "sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/not-found.test.tsx"
git commit -m "feat(website): add edit-invoice not-found boundary"
```

---

## Task 14: Route view-invoice backend 404s to the not-found boundary

**Files:**
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx:131–135`

**Background:** The current page has blanket failure handling — any non-success from `fetchInvoice` returns `<RenderForbiddenScreen />`. Backend 404s (non-existent invoice ID) render the same Forbidden UI as 403s (unauthorized), which is semantically wrong. This task surgically peels off the 404 case to route it to the boundary from Task 12, while leaving 403 / 500 / network errors on the existing Forbidden path.

**Before (`sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx:124–138`):**

```tsx
export default async function ViewInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoiceResult = await fetchInvoice({invoiceId: invoiceIdentifier});
  if (!invoiceResult.success) {
    // Handle fetch error - show forbidden screen for auth errors or not found
    return <RenderForbiddenScreen />;
  }

  const invoice = invoiceResult.data;

  // Return 404 for soft-deleted invoices
  if (invoice.isSoftDeleted) {
    notFound();
  }
```

**After:**

```tsx
export default async function ViewInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoiceResult = await fetchInvoice({invoiceId: invoiceIdentifier});
  if (!invoiceResult.success) {
    // 404 → dedicated not-found boundary; other failures → forbidden.
    if (invoiceResult.error.status === 404) notFound();
    return <RenderForbiddenScreen />;
  }

  const invoice = invoiceResult.data;

  // Return 404 for soft-deleted invoices
  if (invoice.isSoftDeleted) {
    notFound();
  }
```

- [ ] **Step 14.1: Apply the diff**

In `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`, locate the `if (!invoiceResult.success)` block (line 132) and replace its body with the three lines shown in AFTER:

```tsx
  if (!invoiceResult.success) {
    // 404 → dedicated not-found boundary; other failures → forbidden.
    if (invoiceResult.error.status === 404) notFound();
    return <RenderForbiddenScreen />;
  }
```

The `import {notFound} from "next/navigation"` on line 9 is already present — no import change.

- [ ] **Step 14.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0. If TypeScript complains that `status` does not exist on the error type, check `src/lib/utils.server.ts` for the `ServerActionResult` definition and confirm the error shape has `status: number`; it does, per `fetchInvoices.ts:113–117`.

- [ ] **Step 14.3: Sanity check via the dev server**

```bash
cd sites/arolariu.ro && npm run dev
```

In another terminal, hit `https://localhost:3000/domains/invoices/view-invoice/00000000-0000-0000-0000-000000000000` (a GUID-shaped ID that does not exist server-side). Expected: the Task-12 not-found UI renders (with `Errors.notFound.title`). Kill the dev server with Ctrl+C.

- [ ] **Step 14.4: Commit**

```bash
git add "sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx"
git commit -m "feat(website): route view-invoice backend 404s to not-found boundary"
```

---

## Task 15: Route edit-invoice backend 404s to the not-found boundary

**Files:**
- Modify: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx:131–135`

**Background:** Same shape as Task 14 — the current code treats all `fetchInvoice` failures uniformly.

**Before (`sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx:121–143`):**

```tsx
export default async function EditInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/edit-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;

  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  if (!isAuthenticated) return <RenderForbiddenScreen />;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoiceResult = await fetchInvoice({invoiceId: invoiceIdentifier});
  if (!invoiceResult.success) {
    // Handle fetch error - show forbidden screen for auth errors or not found
    return <RenderForbiddenScreen />;
  }

  const invoice = invoiceResult.data;

  // Return 404 for soft-deleted invoices
  if (invoice.isSoftDeleted) {
    notFound();
  }
```

**After:**

```tsx
export default async function EditInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/edit-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;

  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  if (!isAuthenticated) return <RenderForbiddenScreen />;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoiceResult = await fetchInvoice({invoiceId: invoiceIdentifier});
  if (!invoiceResult.success) {
    // 404 → dedicated not-found boundary; other failures → forbidden.
    if (invoiceResult.error.status === 404) notFound();
    return <RenderForbiddenScreen />;
  }

  const invoice = invoiceResult.data;

  // Return 404 for soft-deleted invoices
  if (invoice.isSoftDeleted) {
    notFound();
  }
```

- [ ] **Step 15.1: Apply the diff**

In `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx`, replace the body of the `if (!invoiceResult.success)` block exactly as shown in AFTER.

- [ ] **Step 15.2: Type-check**

```bash
cd sites/arolariu.ro && tsgo --noEmit -p tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 15.3: Sanity check via the dev server**

```bash
cd sites/arolariu.ro && npm run dev
```

Sign in, then hit `https://localhost:3000/domains/invoices/edit-invoice/00000000-0000-0000-0000-000000000000`. Expected: the Task-13 not-found UI renders. Kill the dev server.

- [ ] **Step 15.4: Commit**

```bash
git add "sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx"
git commit -m "feat(website): route edit-invoice backend 404s to not-found boundary"
```

---

## Task 16: Verify coverage thresholds are enforced

**Files:**
- Inspect only: `sites/arolariu.ro/vitest.config.ts`, root `vitest.config.ts`

**Why this is a verification and not a change:** the root `vitest.config.ts:52–57` already defines `thresholds: {branches: 90, functions: 90, lines: 90, statements: 90}`, and the site's `vitest.config.ts` uses `mergeConfig` which deep-merges the `coverage` block. This task confirms the merged config enforces the thresholds.

- [ ] **Step 16.1: Run the full unit-test suite with coverage**

```bash
cd sites/arolariu.ro && npm run test:unit -- --coverage
```

Look at the final output block. Expected: a `Coverage thresholds` section with branches / functions / lines / statements each showing a numeric value and, if below 90, an `ERROR: Coverage for <metric> (X%) does not meet global threshold (90%)` line.

- [ ] **Step 16.2: Branch based on the outcome**

- **Passes with coverage printed and no threshold error:** thresholds are enforced — skip to 16.4.
- **Passes but no threshold section prints:** the merge is dropping thresholds. Add an explicit re-declaration (see 16.3).
- **Fails because coverage is below 90%:** thresholds are enforced but the site doesn't meet them today. **Do not lower the thresholds here.** Record the delta in the final PR; file a follow-up plan `2026-04-MM-coverage-uplift.md`; treat Task 16 as complete.

- [ ] **Step 16.3 (conditional — only if Step 16.2 shows missing thresholds): re-declare in the site config**

**Before (`sites/arolariu.ro/vitest.config.ts:24–33`):**

```ts
      coverage: {
        exclude: [
          "**/instrumentation.server.ts",
          "**/instrumentation.ts",
          "**/.next/**",
          "**/tests/**",
          "**/export/InvoicePDF.tsx", // @react-pdf/renderer template — not unit-testable
          "**/*.stories.tsx", // Storybook stories
        ],
      },
```

**After:**

```ts
      coverage: {
        thresholds: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        exclude: [
          "**/instrumentation.server.ts",
          "**/instrumentation.ts",
          "**/.next/**",
          "**/tests/**",
          "**/export/InvoicePDF.tsx", // @react-pdf/renderer template — not unit-testable
          "**/*.stories.tsx", // Storybook stories
        ],
      },
```

Re-run Step 16.1 to confirm the threshold section now appears.

- [ ] **Step 16.4: Commit (or no-op)**

If Step 16.3 was executed:

```bash
git add sites/arolariu.ro/vitest.config.ts
git commit -m "chore(website): re-declare 90% coverage thresholds explicitly in site vitest config"
```

Otherwise nothing to commit — note the verification outcome in the PR description for this plan.

---

## Final verification

After all tasks land, run the full ritual once:

```bash
cd sites/arolariu.ro
npm run lint
tsgo --noEmit -p tsconfig.json
npm run test:unit -- --coverage
npm run build
```

Expected: all four exit 0. The `tsgo` run should complete noticeably faster than `tsc` — that time save is the TSGO payoff that compounds across every subsequent refinement plan.

---

## Self-Review Checklist

- **Spec coverage:**
  - G2 (tsconfig regressions) → Tasks 3, 4.13, 5.
  - G4 (error + not-found boundaries) → Tasks 6–15.
  - G15 (coverage thresholds) → Task 16 (verification).
  - G18 (@ts-ignore on CSS imports) → Tasks 1, 2.
  - G20 (allowArbitraryExtensions) → Task 3.
  - Enum migration (unblocker for G2) → Task 4.
  - TSGO adoption (user directive) → used throughout via the assumed-on-PATH `tsgo` binary; no `devDependency` added.
  All gaps from the Foundation scope are covered.

- **Placeholders:** none. Every step has concrete commands or code. The three open-ended branches — Task 4.1 reverse-lookup grep, Task 5.3 pattern selection, Task 16.2 merge-behavior branch — each ship with explicit decision rules and fallback instructions.

- **Type consistency:**
  - Error-boundary prop shape `{error: Error & {digest?: string}; reset: () => void}` is used in Tasks 6, 8–11.
  - Translation namespaces: `Errors.globalError` (Tasks 6, 8–11), `Errors.notFound` (Tasks 7, 12, 13). No rename drift.
  - Enum migration pattern (const object + `(typeof X)[keyof typeof X]` union) is identical across Tasks 4.2–4.11.
  - `ServerActionResult` error shape `{code, message, status}` is referenced at Task 14.1 / 15.1 and grounded against `fetchInvoices.ts:111–117`.

- **Out of scope:** CSP (G3), middleware.ts (G5), pagination (G8), JWT caching (G9), revalidateTag (G10), error tracking (G16), pre-commit hooks (G19), component decomposition (G13), InvoicePDF refactor (G14) — per user directives, none appear in this plan.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-website-foundation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent implements each task, with review checkpoints between tasks. Best for Tasks 4 and 5, whose blast radius (enum migration; exactOptionalPropertyTypes rollbacks) benefits from an isolated execution context.

2. **Inline Execution** — batch in this session using `superpowers:executing-plans`, with checkpoints after Task 4 (largest diff), Task 5 (second-largest), and Task 11 (all scoped error boundaries in).

Which approach?
