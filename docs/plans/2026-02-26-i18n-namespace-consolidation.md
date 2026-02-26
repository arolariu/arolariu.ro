# i18n Namespace Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the i18n namespace architecture to be consistent, shallow, route-aligned, and performant — consolidating 18 inconsistently-named namespaces (max depth 9) into a clean 13-namespace structure (max depth 5) with unified PascalCase naming.

**Architecture:** Adopt a hybrid route-aligned + shared namespace strategy. Each App Router route segment owns a PascalCase namespace. Shared UI translations (header, footer, nav, errors, actions) live in a `Common` namespace. The deeply-nested `Domains.services.invoices` tree (1,097 keys, depth 9) gets flattened into a promoted `Invoices` namespace (depth 4). Legacy duplicates (`Profile`, `Shared`, `I18nConsolidation`) are absorbed and removed.

**Tech Stack:** next-intl 4.x, Next.js 16 App Router, TypeScript strict mode, ICU MessageFormat, cookie-based locale routing (en/ro/fr)

---

## Current State Analysis

| Metric | Value |
|--------|-------|
| Locale files | `messages/{en,ro,fr}.json` (~268KB each, 5,404 lines) |
| Top-level namespaces | 18 |
| Max nesting depth | 9 (`Domains.services.invoices.service.view-scans.header.*`) |
| Total translatable strings | 3,188 |
| Naming convention | Mixed (PascalCase + camelCase) |
| Legacy/dead namespaces | `Profile` (118 keys, replaced by `MyProfile`), `Shared` (2 keys, redundant with `I18nConsolidation`), `Invoices` (2 keys, only `__metadata__`) |
| WIP namespace | `I18nConsolidation` (879 keys — not referenced by any source file) |
| Client bundle impact | All 268KB sent to client via root `NextIntlClientProvider` |

### Problems

1. **Inconsistent naming**: `About` (PascalCase) vs `errors` (camelCase) vs `privacyPolicy` (camelCase) vs `termsOfService` (camelCase)
2. **Over-nesting**: `Domains.services.invoices.ui.invoiceCard.tabs.productsTab.*` — 9 levels deep
3. **Dead weight**: `Profile` namespace is fully superseded by `MyProfile` but still in the JSON
4. **Fragmented shared translations**: `Shared` (2 keys), `Footer`, `Navigation`, `Commander`, `errors`, `Forbidden` are all global-scope but organized separately with no common actions/labels
5. **Confusing topology**: Invoice translations split across `Invoices.__metadata__`, `Domains.services.invoices.service.*`, and `Domains.services.invoices.ui.*`
6. **Metadata convention inconsistency**: Some use `__metadata__` (About, Domains), some use `meta` (MyProfile), some embed metadata inline

---

## Target State

### Namespace Schema (13 namespaces, PascalCase, max depth 5)

```
Common                    # Shared UI: actions, labels, states, accessibility
  actions                 #   save, cancel, delete, confirm, loading, etc.
  labels                  #   email, name, date, etc.
  states                  #   loading, empty, error, notFound, forbidden
  accessibility           #   aria labels, skip links, screen reader text

Navigation                # Global nav items + mobile nav
Footer                    # Footer content, links, social, copyright
Commander                 # Command palette (Cmd+K)
Errors                    # Error pages (404, globalError)
EULA                      # End User License Agreement modal

Home                      # / page
  metadata                #   SEO title, description
  hero                    #   hero section
  features                #   features tab
  technologies            #   tech tab
  cta                     #   call to action
  appreciation            #   appreciation section

About                     # /about/* pages
  metadata                #   Hub SEO
  Hub                     #   /about hub (hero, mission, values, stats, nav, faq, cta)
  Author                  #   /about/the-author (metadata, bio, competencies, etc.)
  Platform                #   /about/the-platform (metadata, hero, features, etc.)

Auth                      # /auth/* pages
  metadata                #   Auth hub SEO
  Island                  #   Auth hub island
  SignIn                  #   /auth/sign-in (metadata + form)
  SignUp                  #   /auth/sign-up (metadata + form)

Domains                   # /domains hub page only
  metadata                #   SEO
  title, subtitle         #   page content
  services                #   service cards on hub page

Invoices                  # /domains/invoices/* (promoted from Domains.services.invoices)
  metadata                #   SEO for /domains/invoices
  Homepage                #   /domains/invoices landing (hero, features, workflow, bento, cta)
  UploadScans             #   /domains/invoices/upload-scans (metadata + upload UI)
  ViewScans               #   /domains/invoices/view-scans (metadata + header, grid, cards, toolbar)
  ViewInvoices            #   /domains/invoices/view-invoices (metadata + island, header, views)
  ViewInvoice             #   /domains/invoices/view-invoice/[id] (metadata + all cards/charts/tabs)
  EditInvoice             #   /domains/invoices/edit-invoice/[id] (metadata + all cards/dialogs/tabs)
  Shared                  #   Shared invoice components (invoiceHeader, triviaTips, states, dialogs)

Profile                   # /my-profile (consolidated from MyProfile + Profile)
  metadata                #   SEO
  header                  #   profile header
  sidebar                 #   sidebar nav
  stats                   #   quick stats
  island                  #   island-level strings
  settings                #   settings sections (appearance, ai, analytics, notifications, security, data)

Legal                     # /privacy-policy + /terms-of-service (consolidated)
  PrivacyPolicy           #   privacy policy (metadata, title, last_updated, contactInfo, terms)
  TermsOfService          #   terms of service (metadata, title, last_updated, contactInfo, terms)

Acknowledgements          # /acknowledgements (kept as-is, already clean)
  metadata                #   SEO
  hero, stats, ...        #   page sections
```

### Key Changes Summary

| Before | After | Change |
|--------|-------|--------|
| `errors` (camelCase) | `Errors` (PascalCase) | Rename |
| `privacyPolicy` + `termsOfService` | `Legal.PrivacyPolicy` + `Legal.TermsOfService` | Consolidate under Legal |
| `Authentication` | `Auth` | Rename (shorter, matches route) |
| `Domains.services.invoices.*` (depth 9) | `Invoices.*` (depth 5) | Promote + flatten |
| `MyProfile` + `Profile` | `Profile` | Merge (keep MyProfile content, adopt "Profile" name) |
| `Shared` (2 keys) | `Common` (expanded) | Expand with extracted shared patterns |
| `I18nConsolidation` | Absorbed into target namespaces | Remove WIP namespace |
| `Invoices` (just `__metadata__`) | `Invoices.metadata` | Absorbed into promoted Invoices |
| `__metadata__` convention | `metadata` (no underscores) | Standardize |
| `Forbidden.Screen` | `Common.states.forbidden` | Move to shared states |

### Naming Rules

1. **Top-level**: PascalCase (`About`, `Auth`, `Invoices`, `Legal`)
2. **Second-level sub-namespaces**: PascalCase for route-segments (`Hub`, `Author`, `SignIn`, `ViewScans`), camelCase for semantic groups (`metadata`, `hero`, `actions`)
3. **Keys**: camelCase always (`title`, `subtitle`, `heroDescription`, `loadingText`)
4. **Metadata**: Always `metadata` (not `__metadata__`, not `meta`)
5. **Max depth**: 5 levels (namespace.section.group.subgroup.key)

---

## Implementation Tasks

### Task 1: Create Migration Script

**Files:**
- Create: `sites/arolariu.ro/scripts/migrate-i18n.mjs`

**Step 1: Write the migration script**

Create a Node.js script that:
1. Reads `messages/en.json` (source of truth for structure)
2. Transforms the namespace structure according to the target schema
3. Writes the result to `messages/en.json` (overwrite)
4. Repeats for `ro.json` and `fr.json`
5. Logs a summary of changes (moved keys, renamed namespaces, removed keys)

```javascript
// scripts/migrate-i18n.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '..', 'messages');
const locales = ['en', 'ro', 'fr'];

function migrateMessages(source) {
  const target = {};

  // 1. Common — expand from Shared + extract shared patterns
  target.Common = {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      retry: 'Try again',
      returnHome: 'Return to home',
      loading: 'Loading...',
      copyToClipboard: 'Copy to clipboard',
      copied: 'Copied!',
    },
    labels: {
      // Extract from context as needed
    },
    states: {
      loading: 'Loading...',
      empty: 'No items found',
      error: 'An error occurred',
      notFound: source.errors?.['404'] ?? {},
      forbidden: source.Forbidden?.Screen ?? {},
    },
    accessibility: {
      logoAlt: source.Shared?.header?.logoAlt ?? source.I18nConsolidation?.Header?.logoAlt ?? 'arolariu.ro logo',
      toggleTheme: source.Shared?.themeButton?.toggleAriaLabel ?? source.I18nConsolidation?.ThemeButton?.toggleAriaLabel ?? 'Toggle theme',
      skipToContent: 'Skip to content',
    },
  };

  // 2. Navigation — keep as-is, just ensure PascalCase
  target.Navigation = source.Navigation;

  // 3. Footer — keep as-is
  target.Footer = source.Footer;

  // 4. Commander — keep as-is
  target.Commander = source.Commander;

  // 5. Errors — rename from 'errors', merge GlobalError from I18nConsolidation
  target.Errors = {
    notFound: source.errors?.['404'] ?? {},
    globalError: source.I18nConsolidation?.GlobalError ?? source.errors?.globalError ?? {},
  };

  // 6. EULA — keep as-is
  target.EULA = source.EULA;

  // 7. Home — restructure with consistent metadata
  target.Home = {
    metadata: source.Home?.__metadata__ ?? { title: 'Home', description: '' },
    ...Object.fromEntries(
      Object.entries(source.Home ?? {}).filter(([k]) => k !== '__metadata__')
    ),
  };

  // 8. About — keep structure, rename __metadata__ to metadata
  target.About = renameMetadata(source.About);

  // 9. Auth — rename from Authentication
  target.Auth = renameMetadata(source.Authentication);

  // 10. Domains — keep hub page content only, remove services.invoices (moved to Invoices)
  target.Domains = {
    metadata: source.Domains?.__metadata__ ?? {},
    title: source.Domains?.title,
    subtitle: source.Domains?.subtitle,
    services: source.Domains?.services
      ? Object.fromEntries(
          Object.entries(source.Domains.services).filter(([k]) => k !== 'invoices')
        )
      : {},
  };

  // 11. Invoices — promoted from Domains.services.invoices + top-level Invoices
  const invoiceSrc = source.Domains?.services?.invoices ?? {};
  const invoiceUI = invoiceSrc.ui ?? {};
  const invoiceService = invoiceSrc.service ?? {};
  const consolidationInvoices = source.I18nConsolidation?.Invoices ?? {};
  target.Invoices = buildInvoicesNamespace(invoiceSrc, invoiceUI, invoiceService, consolidationInvoices, source.Invoices);

  // 12. Profile — consolidated from MyProfile (primary) + Profile (legacy fallback)
  target.Profile = buildProfileNamespace(source.MyProfile, source.Profile, source.I18nConsolidation?.MyProfileIsland);

  // 13. Legal — consolidated from privacyPolicy + termsOfService
  target.Legal = {
    PrivacyPolicy: renameMetadata(source.privacyPolicy),
    TermsOfService: renameMetadata(source.termsOfService),
  };

  // 14. Acknowledgements — keep, rename __metadata__
  target.Acknowledgements = renameMetadata(source.Acknowledgements);

  return target;
}

function renameMetadata(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__metadata__') {
      result.metadata = value;
    } else if (key === 'meta') {
      result.metadata = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = renameMetadata(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function buildInvoicesNamespace(invoiceSrc, invoiceUI, invoiceService, consolidation, topLevelInvoices) {
  // This will be filled in during implementation with actual key mappings
  // Placeholder structure showing the target shape
  return {
    metadata: topLevelInvoices?.__metadata__ ?? {},
    Homepage: invoiceService?.homepage ?? {},
    UploadScans: { metadata: invoiceService?.['upload-scans']?.['__metadata__'] ?? {}, ...invoiceService?.['upload-scans'] ?? {} },
    ViewScans: { metadata: invoiceService?.['view-scans']?.['__metadata__'] ?? {}, ...invoiceService?.['view-scans'] ?? {} },
    ViewInvoices: { metadata: invoiceService?.['view-invoices']?.['__metadata__'] ?? {}, ...invoiceService?.['view-invoices'] ?? {} },
    ViewInvoice: { metadata: invoiceService?.['view-page']?.['__metadata__'] ?? {} },
    EditInvoice: { metadata: invoiceService?.['edit-page']?.['__metadata__'] ?? {} },
    Shared: {
      // Shared invoice UI components
      invoiceHeader: invoiceUI?.invoiceHeader ?? {},
      triviaTips: invoiceUI?.triviaTips ?? {},
      states: invoiceService?.states ?? {},
      // Dialogs from I18nConsolidation
      ...Object.fromEntries(
        Object.entries(consolidation).filter(([k]) => k.endsWith('Dialog'))
      ),
    },
    // Remaining UI components distributed to their owning routes
    ui: invoiceUI,
  };
}

function buildProfileNamespace(myProfile, legacyProfile, consolidationProfile) {
  const base = renameMetadata(myProfile ?? {});
  // Merge consolidation additions
  if (consolidationProfile) {
    base.island = { ...base.island, ...consolidationProfile };
  }
  return base;
}

// Execution
for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const source = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const migrated = migrateMessages(source);
  fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2) + '\n', 'utf-8');
  console.log(`Migrated ${locale}.json`);
}
```

> **Note:** This script is a structural skeleton. During implementation, the exact key mappings for the Invoices namespace (which has 1,097 keys across `ui` and `service` sub-namespaces) must be filled in by reading every component's `useTranslations` call and mapping its namespace path to the new location. **Task 7 handles the detailed Invoices mapping.**

**Step 2: Run the script on en.json only first (dry-run)**

```bash
# Make a backup first
cp messages/en.json messages/en.json.bak
node scripts/migrate-i18n.mjs
```

**Step 3: Verify the output structure**

```bash
node -e "const en = require('./messages/en.json'); console.log(Object.keys(en));"
# Expected: Common, Navigation, Footer, Commander, Errors, EULA, Home, About, Auth, Domains, Invoices, Profile, Legal, Acknowledgements
```

**Step 4: Commit**

```bash
git add scripts/migrate-i18n.mjs
git commit -m "chore(i18n): add migration script skeleton for namespace consolidation"
```

---

### Task 2: Build the Exact Component → Namespace Mapping

Before migrating any JSON, we need a complete mapping of every source file's `useTranslations`/`getTranslations` call to its current namespace, and what that namespace becomes in the new structure.

**Files:**
- Create: `docs/plans/i18n-namespace-mapping.md`

**Step 1: Generate the mapping automatically**

```bash
# Extract all useTranslations/getTranslations calls with their namespaces and file paths
grep -rn "useTranslations\|getTranslations" sites/arolariu.ro/src/ --include="*.tsx" --include="*.ts" \
  | grep -oP '(useTranslations|getTranslations)\(["'"'"']([^"'"'"']+)' \
  | sort | uniq -c | sort -rn > docs/plans/i18n-current-usage.txt
```

**Step 2: Create the before→after mapping table**

For every unique namespace used in source files, document:
- Current namespace path
- Source file(s) that use it
- New namespace path in target structure

This is the critical artifact — every subsequent task uses this mapping to know exactly which `useTranslations("old.path")` calls need updating to `useTranslations("new.path")`.

**Step 3: Review the mapping for completeness**

Ensure every namespace used in source code has a mapping entry. Ensure no keys are lost.

**Step 4: Commit**

```bash
git add docs/plans/i18n-namespace-mapping.md docs/plans/i18n-current-usage.txt
git commit -m "docs(i18n): complete component-to-namespace mapping for migration"
```

---

### Task 3: Migrate JSON — Common, Navigation, Footer, Commander, EULA

Migrate the global/shared namespaces that appear on every page.

**Files:**
- Modify: `messages/en.json`, `messages/ro.json`, `messages/fr.json`

**Step 1: Create `Common` namespace**

Extract and build `Common` from:
- `Shared.header` → `Common.accessibility.logoAlt`
- `Shared.themeButton` → `Common.accessibility.toggleTheme`
- `Forbidden.Screen` → `Common.states.forbidden`
- Commonly duplicated strings (Cancel, Save, Delete, Loading, etc.) → `Common.actions`

**Step 2: Keep Navigation, Footer, Commander, EULA as-is**

These are already clean. No structural changes needed.

**Step 3: Remove `Shared` and `Forbidden` top-level namespaces**

After extracting their content to `Common`, delete the old namespaces.

**Step 4: Run `npm run generate` to regenerate `en.d.json.ts`**

```bash
npm run generate
```

**Step 5: Commit**

```bash
git add messages/en.json messages/ro.json messages/fr.json
git commit -m "feat(i18n): create Common namespace, remove Shared and Forbidden"
```

---

### Task 4: Migrate JSON — Errors

**Files:**
- Modify: `messages/{en,ro,fr}.json`

**Step 1: Rename `errors` → `Errors`**

```json
// Before
{ "errors": { "404": { ... }, "globalError": { ... } } }

// After
{ "Errors": { "notFound": { ... }, "globalError": { ... } } }
```

Key changes:
- `errors` → `Errors` (PascalCase)
- `errors.404` → `Errors.notFound` (numeric keys are fragile)
- Merge `I18nConsolidation.GlobalError` into `Errors.globalError` (it has richer content)

**Step 2: Update source files**

| File | Before | After |
|------|--------|-------|
| `src/app/not-found.tsx` | `getTranslations("errors.404")` | `getTranslations("Errors.notFound")` |
| `src/app/global-error.tsx` | `useTranslations("errors.globalError")` | `useTranslations("Errors.globalError")` |

**Step 3: Run tests to verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/app/not-found.tsx src/app/global-error.tsx
git commit -m "feat(i18n): rename errors→Errors, adopt I18nConsolidation.GlobalError content"
```

---

### Task 5: Migrate JSON — Auth (rename from Authentication)

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: All files under `src/app/auth/`

**Step 1: Rename `Authentication` → `Auth`**

```json
// Before
{ "Authentication": { "__metadata__": {...}, "Button": {...}, "Island": {...}, "SignIn": {...}, "SignUp": {...} } }

// After
{ "Auth": { "metadata": {...}, "Button": {...}, "Island": {...}, "SignIn": {...}, "SignUp": {...} } }
```

Changes:
- `Authentication` → `Auth`
- `Authentication.__metadata__` → `Auth.metadata`
- `Authentication.SignIn.__metadata__` → `Auth.SignIn.metadata`
- `Authentication.SignUp.__metadata__` → `Auth.SignUp.metadata`

**Step 2: Update all source file references**

Search for `useTranslations("Authentication` and `getTranslations("Authentication` — update to `Auth`.

**Step 3: Build and verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/app/auth/
git commit -m "feat(i18n): rename Authentication→Auth namespace"
```

---

### Task 6: Migrate JSON — Home, About, Acknowledgements (metadata normalization)

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: Files using `__metadata__` or `meta` key

**Step 1: Normalize metadata key names**

For `Home`, `About`, `Acknowledgements`:
- `__metadata__` → `metadata` (all instances, recursively)

**Step 2: Update source file references**

All `getTranslations("About.__metadata__")` → `getTranslations("About.metadata")`
All `getTranslations("Acknowledgements.__metadata__")` → `getTranslations("Acknowledgements.metadata")`
etc.

**Step 3: Build and verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/
git commit -m "feat(i18n): normalize __metadata__→metadata across Home, About, Acknowledgements"
```

---

### Task 7: Migrate JSON — Invoices (the big one)

This is the largest migration: promoting `Domains.services.invoices` (1,097 keys, depth 9) to `Invoices` (depth 5).

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: All files under `src/app/domains/invoices/`

**Step 1: Define the detailed key mapping**

The `Domains.services.invoices` tree has two sub-trees:
- `service` — route-specific content (homepage, upload-scans, view-scans, view-invoices, view-page, edit-page, states, main-page, createInvoiceDialog)
- `ui` — component-specific UI strings (67+ component namespaces like invoiceCard, invoiceHeader, triviaTips, etc.)

Target structure:
```
Invoices
  metadata              ← Invoices.__metadata__ (current top-level)
  Homepage              ← Domains.services.invoices.service.homepage
    metadata            ← Domains.services.invoices.service.homepage.__metadata__ (if exists)
    hero                ← homepage.hero
    features            ← homepage.features
    workflow            ← homepage.workflow
    bento               ← homepage.bento
    cta                 ← homepage.cta
  UploadScans           ← Domains.services.invoices.service.upload-scans
    metadata            ← ...upload-scans.__metadata__
    ...                 ← remaining keys flattened
  ViewScans             ← Domains.services.invoices.service.view-scans
    metadata            ← ...view-scans.__metadata__
    header              ← ...view-scans.header
    scanCard            ← ...view-scans.scanCard
    toolbar             ← ...view-scans.toolbar
    ...                 ← remaining keys
  ViewInvoices          ← Domains.services.invoices.service.view-invoices + ui.viewInvoicesPage + ui.viewInvoicesIsland
    metadata            ← ...view-invoices.__metadata__
    page                ← ui.viewInvoicesPage
    island              ← ui.viewInvoicesIsland OR I18nConsolidation.Invoices.ViewInvoicesIsland
    header              ← ui.invoicesHeader OR I18nConsolidation.Invoices.InvoicesHeader
    views               ← ui.invoicesView OR I18nConsolidation.Invoices.InvoicesView
    generative          ← I18nConsolidation.Invoices.GenerativeView
    messageList         ← ui.messageList (if exists)
  ViewInvoice           ← Domains.services.invoices.service.view-page + ui components
    metadata            ← ...view-page.__metadata__
    header              ← ui.invoiceHeader (shared with EditInvoice)
    analytics           ← ui.invoiceAnalytics
    cards               ← ui.invoiceCard, ui.merchantCard, ui.receiptCard, etc.
    charts              ← ui.spendingChart, ui.categoryChart, etc.
    tabs                ← ui.productsTab, ui.timelineTab, etc.
    timeline            ← ui.invoiceTimeline
    banners             ← ui.invoiceBanner, etc.
  EditInvoice           ← Domains.services.invoices.service.edit-page + ui components
    metadata            ← ...edit-page.__metadata__
    header              ← reference to Invoices.Shared.invoiceHeader
    trivia              ← reference to Invoices.Shared.triviaTips
    cards               ← ui.editInvoiceCard, etc.
    dialogs             ← ui dialogs specific to edit
    tabs                ← edit-specific tabs
  Shared                ← UI components used across multiple invoice routes
    invoiceHeader       ← ui.invoiceHeader
    triviaTips          ← ui.triviaTips
    states              ← Domains.services.invoices.service.states (loading, notFound)
    invoiceNotFound     ← ui.invoiceNotFound (if exists)
    loadingInvoice      ← ui.loadingInvoice (if exists)
    loadingInvoices     ← ui.loadingInvoices
    invoicesNotFound    ← ui.invoicesNotFound
    dialogs             ← I18nConsolidation.Invoices (DeleteInvoiceDialog, ShareInvoiceDialog*, AddScanDialog, RemoveScanDialog, MetadataDialog, ItemsDialog, EditInvoiceContext)
```

> **Critical:** The exact mapping for all 67+ `ui.*` component namespaces must be derived from reading each component's `useTranslations` call in Task 2's mapping document. The structure above is the target shape — the implementer must place each `ui.componentName` namespace under the route that actually uses it (`ViewInvoice`, `EditInvoice`, or `Shared`).

**Step 2: Restructure the Invoices section in all 3 locale files**

Apply the mapping from Step 1 to transform the JSON.

**Step 3: Update source file references (the bulk of the work)**

Every file in `src/app/domains/invoices/` and its sub-routes needs its `useTranslations`/`getTranslations` calls updated. Example changes:

| Before | After |
|--------|-------|
| `useTranslations("Domains.services.invoices.ui.invoiceCard")` | `useTranslations("Invoices.ViewInvoice.cards.invoiceCard")` |
| `useTranslations("Domains.services.invoices.service.homepage")` | `useTranslations("Invoices.Homepage")` |
| `getTranslations("Invoices.__metadata__")` | `getTranslations("Invoices.metadata")` |
| `useTranslations("Domains.services.invoices.service.upload-scans")` | `useTranslations("Invoices.UploadScans")` |
| `useTranslations("Domains.services.invoices.service.states.loading")` | `useTranslations("Invoices.Shared.states.loading")` |

**Step 4: Build and verify**

```bash
npm run build:website
```

**Step 5: Commit**

```bash
git add messages/ src/app/domains/invoices/
git commit -m "feat(i18n): promote Domains.services.invoices→Invoices, flatten to depth 5"
```

---

### Task 8: Migrate JSON — Domains Hub (remove invoice subtree)

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: `src/app/domains/page.tsx`, `src/app/domains/island.tsx`

**Step 1: Trim Domains namespace**

After Task 7 moved invoices out, Domains should only contain:
```json
{
  "Domains": {
    "metadata": { "title": "...", "description": "..." },
    "title": "...",
    "subtitle": "...",
    "services": {
      // Only non-invoice services remain (if any)
      // The invoice service card content stays here since it describes the domain hub card
    }
  }
}
```

**Step 2: Update source references**

- `getTranslations("Domains.__metadata__")` → `getTranslations("Domains.metadata")`

**Step 3: Build and verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/app/domains/
git commit -m "feat(i18n): clean Domains namespace after Invoices promotion"
```

---

### Task 9: Migrate JSON — Profile (consolidate MyProfile + Profile)

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: All files under `src/app/my-profile/`

**Step 1: Merge into single `Profile` namespace**

Use `MyProfile` as the base (it's the active implementation). Rename to `Profile`:
```json
{
  "Profile": {
    "metadata": { /* from MyProfile.meta */ },
    "header": { /* from MyProfile.header */ },
    "sidebar": { /* from MyProfile.sidebar */ },
    "stats": { /* from MyProfile.stats */ },
    "island": { /* from MyProfile.island + I18nConsolidation.MyProfileIsland */ },
    "settings": { /* from MyProfile.settings */ }
  }
}
```

Delete the legacy `Profile` namespace entirely.

**Step 2: Update source references**

- `getTranslations("MyProfile.meta")` → `getTranslations("Profile.metadata")`
- `useTranslations("MyProfile")` → `useTranslations("Profile")`
- `useTranslations("MyProfile.sidebar.nav")` → `useTranslations("Profile.sidebar.nav")`
- `useTranslations("MyProfile.stats")` → `useTranslations("Profile.stats")`
- `useTranslations("MyProfile.settings.appearance")` → `useTranslations("Profile.settings.appearance")`
- etc.

**Step 3: Build and verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/app/my-profile/
git commit -m "feat(i18n): consolidate MyProfile+Profile→Profile namespace"
```

---

### Task 10: Migrate JSON — Legal (consolidate privacyPolicy + termsOfService)

**Files:**
- Modify: `messages/{en,ro,fr}.json`
- Modify: Files under `src/app/(privacy-and-terms)/`

**Step 1: Create `Legal` namespace**

```json
{
  "Legal": {
    "PrivacyPolicy": {
      "metadata": { /* from privacyPolicy.__metadata__ */ },
      "title": "...",
      "last_updated": "...",
      "contactInformation": { ... },
      "terms": { ... }
    },
    "TermsOfService": {
      "metadata": { /* from termsOfService.__metadata__ */ },
      "title": "...",
      "last_updated": "...",
      "contactInformation": { ... },
      "terms": { ... }
    }
  }
}
```

Delete `privacyPolicy` and `termsOfService` top-level namespaces.

**Step 2: Update source references**

- `getTranslations("privacyPolicy.__metadata__")` → `getTranslations("Legal.PrivacyPolicy.metadata")`
- `useTranslations("privacyPolicy")` → `useTranslations("Legal.PrivacyPolicy")`
- `getTranslations("termsOfService.__metadata__")` → `getTranslations("Legal.TermsOfService.metadata")`
- `useTranslations("termsOfService")` → `useTranslations("Legal.TermsOfService")`

**Step 3: Build and verify**

```bash
npm run build:website
```

**Step 4: Commit**

```bash
git add messages/ src/app/(privacy-and-terms)/
git commit -m "feat(i18n): consolidate privacyPolicy+termsOfService→Legal namespace"
```

---

### Task 11: Remove Legacy Namespaces and I18nConsolidation

**Files:**
- Modify: `messages/{en,ro,fr}.json`

**Step 1: Remove from all 3 locale files**

Delete these top-level keys:
- `Shared` (absorbed into `Common`)
- `Forbidden` (absorbed into `Common.states.forbidden`)
- `I18nConsolidation` (absorbed into target namespaces in Tasks 3-10)
- `Profile` (old legacy, replaced by consolidated `Profile` from `MyProfile`)

**Step 2: Verify no source files reference removed namespaces**

```bash
grep -rn "useTranslations\|getTranslations" sites/arolariu.ro/src/ --include="*.tsx" --include="*.ts" \
  | grep -E "Shared|Forbidden|I18nConsolidation|\"Profile\""
# Expected: zero results (all references updated in prior tasks)
```

**Step 3: Commit**

```bash
git add messages/
git commit -m "chore(i18n): remove legacy namespaces (Shared, Forbidden, I18nConsolidation, old Profile)"
```

---

### Task 12: Update Global Components to Use Common Namespace

**Files:**
- Modify: `src/components/Header.tsx` (or wherever header lives)
- Modify: `src/components/Buttons/ThemeButton.tsx`
- Modify: `src/presentation/ForbiddenScreen.tsx`

**Step 1: Update Header**

```typescript
// Before
const t = useTranslations("Shared.header");
// After
const t = useTranslations("Common.accessibility");
// Usage: t("logoAlt")
```

**Step 2: Update ThemeButton**

```typescript
// Before
const t = useTranslations("Shared.themeButton");
// After
const t = useTranslations("Common.accessibility");
// Usage: t("toggleTheme")
```

**Step 3: Update ForbiddenScreen**

```typescript
// Before
const t = useTranslations("Forbidden.Screen");
// After
const t = useTranslations("Common.states.forbidden");
```

**Step 4: Build and verify**

```bash
npm run build:website
```

**Step 5: Commit**

```bash
git add src/components/ src/presentation/
git commit -m "feat(i18n): update global components to use Common namespace"
```

---

### Task 13: Regenerate Types and Run Full Verification

**Files:**
- Auto-generated: `messages/en.d.json.ts`

**Step 1: Regenerate the type declaration file**

```bash
cd sites/arolariu.ro
npm run generate
```

This triggers the `createMessagesDeclaration` experimental feature, regenerating `messages/en.d.json.ts` from the new `en.json` structure.

**Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

All `useTranslations`/`getTranslations` calls should type-check against the new namespace structure. Any missed migrations will surface as TS errors.

**Step 3: Run lint**

```bash
npm run lint
```

**Step 4: Run build**

```bash
npm run build:website
```

**Step 5: Run unit tests**

```bash
npm run test:website
```

**Step 6: Run E2E tests**

```bash
npm run test:e2e:frontend
```

**Step 7: Commit**

```bash
git add messages/en.d.json.ts
git commit -m "chore(i18n): regenerate type declarations for new namespace structure"
```

---

### Task 14: Clean Up Migration Artifacts

**Files:**
- Delete: `scripts/migrate-i18n.mjs` (if used)
- Delete: `messages/en.json.bak` (if created)
- Modify: `docs/plans/i18n-namespace-mapping.md` — add "COMPLETED" status

**Step 1: Remove temporary files**

```bash
rm -f sites/arolariu.ro/scripts/migrate-i18n.mjs
rm -f sites/arolariu.ro/messages/en.json.bak
```

**Step 2: Verify final namespace structure**

```bash
node -e "
const en = require('./sites/arolariu.ro/messages/en.json');
console.log('Namespaces:', Object.keys(en));
console.log('Count:', Object.keys(en).length);
// Expected: 13 namespaces
// Common, Navigation, Footer, Commander, Errors, EULA, Home, About, Auth, Domains, Invoices, Profile, Legal, Acknowledgements
"
```

**Step 3: Final analysis**

Run the same analysis as pre-migration to confirm improvements:
- Namespace count: 18 → 13
- Max depth: 9 → 5
- Naming: Mixed → PascalCase consistent
- Dead namespaces: 0

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(i18n): clean up migration artifacts, finalize consolidation"
```

---

## Post-Migration: Performance Optimization (Future Tasks)

These are NOT part of this plan but should be considered for follow-up:

### P1: Selective Client Message Delivery

Currently ALL messages (~268KB) are sent to the client. After consolidation, consider:

```typescript
// In providers.tsx — only send what client components need
import pick from 'lodash/pick';

const clientMessages = pick(messages, [
  'Common',
  'Navigation',
  'Footer',
  'Commander',
  'EULA',
]);

<NextIntlClientProvider locale={locale} messages={clientMessages}>
```

Then use scoped `NextIntlClientProvider` in page layouts for route-specific client translations.

### P2: Split Locale Files by Domain

If file size becomes unwieldy (>500KB), split into:
```
messages/en/
  common.json    # Common, Navigation, Footer, Commander, Errors, EULA
  home.json      # Home
  about.json     # About
  auth.json      # Auth
  invoices.json  # Invoices
  profile.json   # Profile
  legal.json     # Legal
  ack.json       # Acknowledgements
```

With merge logic in `i18n/request.ts`.

### P3: Translate on Server, Pass Props to Islands

Leverage the Island Pattern for zero-cost client i18n:

```typescript
// page.tsx (Server Component)
const t = await getTranslations("Invoices.ViewInvoice");
return <ViewInvoiceIsland
  title={t("metadata.title")}
  headerLabels={{ status: t("header.status"), total: t("header.total") }}
/>;
```

This eliminates the need to send invoice translations to the client entirely.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Missed namespace reference → runtime crash | TypeScript strict types + `createMessagesDeclaration` catches all mismatches at build time |
| Translation key mismatch across locales | Migration script operates on structure only, preserving translated values |
| Large PR → merge conflicts | Commit after each task, rebase frequently |
| E2E tests break on changed text | Tests should use data-testid, not text matchers — verify before migration |
| I18nConsolidation has NEW keys not in other namespaces | Merge strategy: I18nConsolidation content takes priority as it's newer/richer |

---

## Success Criteria

- [ ] 13 top-level PascalCase namespaces (down from 18)
- [ ] Max nesting depth ≤ 5 (down from 9)
- [ ] Zero `__metadata__` keys (all renamed to `metadata`)
- [ ] Zero legacy namespaces (`Shared`, `Forbidden`, `I18nConsolidation`, old `Profile`)
- [ ] `npm run build:website` passes
- [ ] `npm run test:website` passes
- [ ] `npm run test:e2e:frontend` passes
- [ ] `npm run lint` passes
- [ ] All 3 locale files (`en.json`, `ro.json`, `fr.json`) structurally identical
- [ ] TypeScript type check (`tsc --noEmit`) passes with new `en.d.json.ts`
