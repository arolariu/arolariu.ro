# Create Invoice Route

## Overview

A complete 3-step wizard for creating invoices from uploaded scans. This route implements a client-side island pattern with server-side authentication and metadata generation.

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
├── page.tsx                    # RSC with auth check
├── page.module.scss            # Page container styles
├── loading.tsx                 # Suspense fallback
├── loading.module.scss         # Loading skeleton styles
├── island.tsx                  # Client island (wizard orchestrator)
├── island.module.scss          # Island styles
├── _context/
│   └── CreateInvoiceContext.tsx    # Wizard state management
└── _components/
    ├── StepIndicator.tsx           # Visual step progress indicator
    ├── StepIndicator.module.scss
    ├── ScanSelector.tsx            # Step 1: Select scans
    ├── ScanSelector.module.scss
    ├── InvoiceDetailsForm.tsx      # Step 2: Enter details
    ├── InvoiceDetailsForm.module.scss
    ├── ReviewStep.tsx              # Step 3: Review & create
    └── ReviewStep.module.scss
```

## Wizard Flow

### Step 1: Select Scans
- Display grid of available READY scans from Zustand store
- Multi-select with checkbox overlay
- "Select All" / "Clear Selection" actions
- Shows selected count badge
- Validation: At least 1 scan must be selected

### Step 2: Invoice Details
- **Invoice Name** (required) - Auto-suggested from first scan's filename
- **Category** - Dropdown with InvoiceCategory enum options
- **Payment Type** - Dropdown with PaymentType enum options
- **Transaction Date** - Calendar picker (defaults to today)
- **Description** (optional) - Textarea for notes
- Validation: Name must not be empty

### Step 3: Review & Create
- Summary card showing:
  - Selected scans as thumbnails
  - All invoice details
- "Create Invoice" button with loading state
- On success:
  1. Creates invoice via server action
  2. Marks scans as used in Zustand store
  3. Prompts user for AI analysis (optional)
  4. Redirects to `/domains/invoices/view-invoice/[id]`

## State Management

### Context: `CreateInvoiceContext`

Manages wizard state including:

```typescript
interface CreateInvoiceContextValue {
  // Navigation
  currentStep: WizardStep;
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
  setCategory: (category: InvoiceCategory) => void;
  // ... other setters

  // Invoice creation
  isCreating: boolean;
  createInvoiceWithScans: () => Promise<void>;
}
```

## Server Actions Used

- `fetchAaaSUserFromAuthService` - Auth check (page.tsx)
- `createInvoice` - Creates invoice entity (context)
- `analyzeInvoice` - Triggers AI analysis (context, optional)

## Type Safety

All types are properly defined with strict TypeScript:

```typescript
import type {Invoice, InvoiceCategory, InvoiceScanType} from "@/types/invoices";
import type {PaymentType} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
```

## Styling

### SCSS Modules Pattern

```scss
@use '../../../../../styles/abstracts' as *;

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
  enter: { x: 50, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -50, opacity: 0 },
};
```

## Empty States

When no READY scans available:
- Shows friendly empty state card
- Links to Upload Scans page
- Links to View Scans page

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

## i18n Keys Required

Add to `messages/en.json` and `messages/ro.json`:

```json
{
  "Invoices": {
    "CreateInvoice": {
      "metadata": {
        "title": "Create Invoice",
        "description": "Create a new invoice from your uploaded scans"
      },
      "header": {
        "title": "Create New Invoice",
        "subtitle": "Turn your scans into structured invoice data",
        "backToInvoices": "Back to Invoices"
      },
      "navigation": {
        "back": "Back",
        "next": "Next"
      },
      "emptyState": {
        "title": "No Scans Available",
        "description": "You need to upload scans before creating an invoice",
        "uploadButton": "Upload Scans",
        "viewScansButton": "View Scans"
      },
      "steps": {
        "selectScans": "Select Scans",
        "details": "Invoice Details",
        "review": "Review & Create"
      },
      "scanSelector": {
        "title": "Select Scans",
        "subtitle": "Choose the scans to include in this invoice",
        "selectedCount": "{count} selected",
        "selectAll": "Select All",
        "clearAll": "Clear All",
        "noScans": "No ready scans available"
      },
      "detailsForm": {
        "title": "Invoice Details",
        "subtitle": "Enter information about this invoice",
        "fields": {
          "name": {
            "label": "Invoice Name",
            "placeholder": "e.g., Grocery Shopping - Lidl",
            "hint": "A descriptive name to identify this invoice"
          },
          "category": {
            "label": "Category",
            "placeholder": "Select a category",
            "options": {
              "notDefined": "Not Defined",
              "grocery": "Grocery",
              "fastFood": "Fast Food",
              "homeCleaning": "Home & Cleaning",
              "carAuto": "Car & Auto",
              "other": "Other"
            }
          },
          "paymentType": {
            "label": "Payment Method",
            "placeholder": "Select payment method",
            "options": {
              "unknown": "Unknown",
              "cash": "Cash",
              "card": "Card",
              "transfer": "Bank Transfer",
              "mobilePayment": "Mobile Payment",
              "voucher": "Voucher",
              "other": "Other"
            }
          },
          "transactionDate": {
            "label": "Transaction Date"
          },
          "description": {
            "label": "Description",
            "placeholder": "Optional notes about this invoice...",
            "hint": "Add any additional context or notes"
          }
        }
      },
      "review": {
        "title": "Review & Create",
        "subtitle": "Verify your selections before creating the invoice",
        "sections": {
          "scans": {
            "title": "Selected Scans"
          },
          "details": {
            "title": "Invoice Details",
            "name": "Name",
            "category": "Category",
            "paymentType": "Payment Method",
            "transactionDate": "Transaction Date",
            "description": "Description"
          }
        },
        "actions": {
          "create": "Create Invoice",
          "creating": "Creating...",
          "hint": "AI analysis will be optional after creation"
        },
        "categories": {
          "notDefined": "Not Defined",
          "grocery": "Grocery",
          "fastFood": "Fast Food",
          "homeCleaning": "Home & Cleaning",
          "carAuto": "Car & Auto",
          "other": "Other"
        },
        "paymentTypes": {
          "unknown": "Unknown",
          "cash": "Cash",
          "card": "Card",
          "transfer": "Bank Transfer",
          "mobilePayment": "Mobile Payment",
          "voucher": "Voucher",
          "other": "Other"
        }
      }
    }
  }
}
```

## Testing Checklist

- [ ] Page loads without errors
- [ ] Auth redirect works for unauthenticated users
- [ ] Step indicator shows correct state
- [ ] Scan selection toggles work
- [ ] Select All / Clear All buttons work
- [ ] Next button disabled when validation fails
- [ ] Back button works correctly
- [ ] Form inputs update state
- [ ] Calendar date picker works
- [ ] Review step shows correct data
- [ ] Create button creates invoice
- [ ] Loading state shows during creation
- [ ] Success toast appears
- [ ] AI analysis prompt appears
- [ ] Redirects to view-invoice page
- [ ] Error handling shows toast on failure

## Performance Considerations

- Images loaded lazily in ScanSelector
- Motion animations are GPU-accelerated
- Context prevents unnecessary re-renders
- Scans loaded from IndexedDB (fast)
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
5. **Auto-categorization**: AI suggests category based on scans
6. **Multi-language**: Full i18n support
7. **Validation**: Client-side schema validation with Zod
8. **Undo**: Allow undo before final creation

## Related Files

- `@/stores/scansStore.tsx` - Source of scan data
- `@/lib/actions/invoices/createInvoice.ts` - Server action
- `@/lib/actions/invoices/analyzeInvoice.ts` - AI analysis trigger
- `@/types/invoices/Invoice.ts` - Invoice type definitions
- `@/types/scans/Scan.ts` - Scan type definitions

## Troubleshooting

### "No scans available"
- User hasn't uploaded any scans yet
- Scans are not in READY status
- IndexedDB not hydrated yet

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
- ✅ SCSS Modules (not Tailwind)
- ✅ i18n for all user-facing text
- ✅ Error boundaries for resilience
- ✅ Loading states for async operations
- ✅ Empty states for no-data scenarios
