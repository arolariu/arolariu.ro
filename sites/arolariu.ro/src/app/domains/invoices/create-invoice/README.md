# Create Invoice Route

## Overview

A complete 3-step wizard for creating invoices from uploaded scans. This route implements a client-side island pattern with server-side
authentication and metadata generation.

## Location

```
sites/arolariu.ro/src/app/domains/invoices/create-invoice/
```

## Architecture

### Pattern: Server Component → Client Island → Context → Components

```
page.tsx (Server)
    ↓
island.tsx (Client)
    ↓
CreateInvoiceContext (State)
    ↓
StepIndicator, ScanSelector, InvoiceDetailsForm, ReviewStep (Components)
```

## File Structure

```
create-invoice/
├── README.md                   # This guide
├── page.tsx                    # RSC with auth check
├── page.module.scss            # Page container styles
├── loading.tsx                 # Suspense fallback (page container + wizard skeleton)
├── island.tsx                  # Client island (scan check + wizard orchestrator)
├── island.module.scss          # Island styles
├── island.test.tsx             # Vitest
├── _context/
│   ├── CreateInvoiceContext.tsx      # Wizard state management
│   └── CreateInvoiceContext.test.tsx # Vitest
└── _components/
    ├── CreateInvoiceSkeleton.module.scss # Shared styles for the route and island skeleton markup
    ├── StepIndicator.tsx           # Visual step progress indicator
    ├── StepIndicator.module.scss
    ├── ScanSelector.tsx            # Step 1: Select scans
    ├── ScanSelector.module.scss
    ├── ScanSelector.test.tsx       # Vitest
    ├── InvoiceDetailsForm.tsx      # Step 2: Enter details
    ├── InvoiceDetailsForm.module.scss
    ├── InvoiceDetailsForm.test.tsx # Vitest
    ├── ReviewStep.tsx              # Step 3: Review & create
    ├── ReviewStep.module.scss
    └── ReviewStep.test.tsx         # Vitest
```

The route `loading.tsx` and the island's scan-check hold state render their skeleton markup separately. This keeps the route fallback
limited to skeleton primitives instead of importing an application component.

## Wizard Flow

### Step 1: Select Scans

- Display grid of available READY scans from Zustand store
- Multi-select with checkbox overlay
- Single "Select All" / "Clear" toggle; "Select All" is disabled when more than 5 READY scans exist
- Paginated grid: 20 scans per page on mobile, 50 on desktop, with Previous/Next controls
- Shows selected count badge
- Validation: At least 1 scan must be selected

### Step 2: Invoice Details

- **Scan preview** - Thumbnail of the first selected scan (PDF scans show a placeholder)
- **Invoice Name** (required) - Auto-suggested from first scan's filename
- **Classification** - `ClassificationPicker` searching the ECOICOP v2 taxonomy
- **Payment Type** - Dropdown with PaymentType enum options
- **Transaction Date** - Calendar picker (defaults to today)
- **Description** (optional) - Textarea for notes
- Validation: Name must not be empty

### Step 3: Review & Create

- Summary card showing:
  - Selected scans as thumbnails
  - All invoice details
- "Create Invoice" button with loading state
- On create (`createInvoiceWithScans`):
  1. Creates the minimal invoice via `createInvoice` (skipped when a previous partial failure preserved the invoice id)
  2. Applies the wizard details via `patchInvoice`
  3. Attaches the remaining scans via `attachScanToInvoice`
  4. Marks the scans as used in the Zustand store and persists their attachment metadata via `updateScan` (fire-and-forget)
  5. Queues AI analysis automatically via `analyzeInvoice` (fire-and-forget; failures are logged, not shown). AI classification is disabled
     when the user picked a classification manually
  6. Shows a success toast and redirects to `/domains/invoices/view-invoice/[id]`
- When the PATCH or a scan attachment fails, the context records a `partialOutcome` and shows an error toast; retrying resumes from the
  failed step without creating a duplicate invoice

## State Management

### Context: `CreateInvoiceContext`

Manages wizard state including (from `_context/CreateInvoiceContext.tsx`):

```typescript
interface CreateInvoiceContextValue {
  // Step management
  currentStep: WizardStep;
  goToStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;

  // Scan selection
  selectedScans: CachedScan[];
  toggleScan: (scan: CachedScan) => void;
  selectAllScans: () => void;
  clearSelection: () => void;

  // Invoice details
  invoiceDetails: InvoiceDetails;
  setName: (name: string) => void;
  setPaymentType: (type: PaymentType) => void;
  setTransactionDate: (date: Date) => void;
  setDescription: (desc: string) => void;

  // Classification (replaces legacy category)
  classificationSelection: ClassificationSelection | null;
  setClassification: (selection: ClassificationSelection | null) => void;

  // Invoice creation
  isCreating: boolean;
  partialOutcome: CreateInvoiceOutcome | null;
  createInvoiceWithScans: () => Promise<void>;
}
```

## Server Actions Used

- `fetchAaaSUserFromAuthService` - Auth check (page.tsx)
- `fetchScans` - Loads the user's scans for the scan availability check (island)
- `createInvoice` - Creates the minimal invoice entity (context)
- `patchInvoice` - Applies name, description, payment information and `classificationCode` (context)
- `attachScanToInvoice` - Reconciles the remaining scans (context)
- `updateScan` - Persists scan attachment metadata (context, fire-and-forget)
- `analyzeInvoice` - Enqueues AI analysis; returns a queue message id, not a result (context, automatic fire-and-forget)

> **Note:** the backend create endpoint persists only owner, initial scan and additional metadata. Wizard details are applied by the
> follow-up PATCH, so a partial failure preserves the created invoice id and retries without creating a duplicate.

## Type Safety

All types are properly defined with strict TypeScript:

```typescript
import type {ClassificationSelection, Invoice, InvoiceScanType} from "@/types/invoices";
import type {PaymentType} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
```

## Styling

### SCSS Modules Pattern

```scss
@use "../../../../../styles/abstracts" as *;

.container {
  @include flex-column;
  gap: space(6);
}
```

Key features:

- Mobile-first responsive design
- Dark mode compatible via `color()` function
- Consistent spacing with `space()` function
- Typography via `font-size()` and `font-weight()`

## Animations

Step transitions use Motion (Framer Motion):

```typescript
const stepVariants: Variants = {
  enter: {x: 50, opacity: 0},
  center: {x: 0, opacity: 1},
  exit: {x: -50, opacity: 0},
};
```

## Scan Availability Check

Before the wizard mounts, the island:

1. Waits for the scans store to hydrate from IndexedDB
2. Fetches the user's scans via the `fetchScans` server action and writes them into the store (IndexedDB)
3. Holds on the wizard skeleton until the fetch settles (cached scans are used if the fetch fails)
4. Redirects to `/domains/invoices/upload-scans` with `router.replace` when no READY scan exists

The check runs once on landing; scans attached by invoice creation do not trigger a redirect.

## Error Handling

- Try-catch around invoice creation
- Toast notifications for success/error
- Validation prevents progression without required data
- Loading states prevent double-submission

## Accessibility

- Semantic HTML structure
- Proper label associations
- Keyboard navigation support
- ARIA attributes where needed
- Focus management in Calendar component

## i18n Keys

Messages live under `forms.invoices.createInvoice` in `messages/en.json`, the source of truth for keys. Its sections are `detailsForm`,
`header`, `metadata`, `navigation`, `reviewStep`, `scanSelector`, `steps`, `errors`, and `toasts`. Components read them through
next-intl-selector, for example `t((m) => m.forms.invoices.createInvoice.toasts.patchFailed)`. Add new keys to `en.json`, `ro.json`, and
`fr.json`, then run `npm run generate:i18n` from the repository root.

## Testing Checklist

- [ ] Page loads without errors
- [ ] Auth redirect works for unauthenticated users
- [ ] Redirects to upload-scans when no READY scan exists
- [ ] Step indicator shows correct state
- [ ] Scan selection toggles work
- [ ] Select All / Clear toggle works (Select All is disabled above 5 READY scans)
- [ ] Next button disabled when validation fails
- [ ] Back button works correctly
- [ ] Form inputs update state
- [ ] Calendar date picker works
- [ ] Review step shows correct data
- [ ] Create button creates invoice
- [ ] Loading state shows during creation
- [ ] Success toast appears
- [ ] Analysis is queued automatically after creation (no prompt)
- [ ] Redirects to view-invoice page
- [ ] Error handling shows toast on failure

## Performance Considerations

- Images loaded lazily in ScanSelector
- Motion animations are GPU-accelerated
- Context prevents unnecessary re-renders
- Scans fetched once on landing and cached in IndexedDB
- SCSS modules enable CSS code-splitting

## Security

- Server-side auth check in page.tsx
- User JWT attached to createInvoice action
- Server actions validate all inputs
- No sensitive data in client-side state

## Future Enhancements

1. **Bulk Actions**: Create multiple invoices at once
2. **Templates**: Save invoice templates for quick creation
3. **Drag & Drop**: Reorder selected scans
4. **Preview**: Show scan preview in modal
5. **Classification suggestions**: Suggest a taxonomy classification from the scans inside the wizard (today, analysis classifies the
   invoice after creation)
6. **Validation**: Client-side schema validation with Zod
7. **Undo**: Allow undo before final creation

## Related Files

- `@/stores/scansStore.tsx` - Source of scan data
- `@/app/domains/invoices/_actions/invoices/createInvoice.ts` - Creates the minimal invoice
- `@/app/domains/invoices/_actions/invoices/patchInvoice.ts` - Applies the wizard details
- `@/app/domains/invoices/_actions/invoices/scans/attachScanToInvoice.ts` - Attaches the remaining scans
- `@/app/domains/invoices/_actions/invoices/analyzeInvoice.ts` - AI analysis trigger
- `@/app/domains/invoices/_actions/scans/fetchScans.ts` - Loads the user's scans
- `@/app/domains/invoices/_actions/scans/updateScan.ts` - Persists scan attachment metadata
- `@/types/invoices/Invoice.ts` - Invoice type definitions
- `@/types/scans/Scan.ts` - Scan type definitions

## Troubleshooting

### Redirected to upload-scans

- User hasn't uploaded any scans yet
- No scan is in READY status (all are attached to invoices)
- The scans fetch failed and the IndexedDB cache holds no READY scan

### Create button doesn't work

- Check network tab for failed API calls
- Verify server action is accessible
- Check console for JavaScript errors

### Types not recognized

- Run `npm run generate` to regenerate types
- Check imports are correct
- Verify TypeScript version is up-to-date

## Documentation Standards

All functions include:

- JSDoc comments with `@param` and `@returns`
- `@remarks` for implementation details
- Type annotations for all parameters
- Explicit return type declarations

## Code Quality

- ✅ No `any` types
- ✅ All props use `Readonly<Props>`
- ✅ Explicit return types: `React.JSX.Element`
- ✅ SCSS Modules
- ✅ i18n for all user-facing text
- ✅ Error boundaries for resilience
- ✅ Loading states for async operations
- ✅ Redirect instead of an empty state when no scans exist
