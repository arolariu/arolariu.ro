# Visual Examples - Scan Grouping + Change History

## 1. ScanGroupBanner Component

### Desktop View
```
┌────────────────────────────────────────────────────────────────────┐
│ 💡  3 scans uploaded together — combine?     [Create Invoice →] [×]│
└────────────────────────────────────────────────────────────────────┘
```

### Mobile View
```
┌─────────────────────────────┐
│ 💡  3 scans uploaded        │
│     together — combine?     │
│                             │
│  [Create Invoice →]    [×]  │
└─────────────────────────────┘
```

### States
- **Default**: Gradient background (primary → secondary), subtle border
- **Hover**: Brighter gradient, animated arrow icon
- **Dismissed**: Hidden (persisted in sessionStorage)

### Interaction Flow
1. User uploads 3 receipts in quick succession (< 5 min apart)
2. Banner appears above ScansGrid
3. User clicks "Create Invoice →"
4. All 3 scans auto-selected, navigate to create dialog
5. User clicks [×] to dismiss
6. Banner hidden for remainder of session

---

## 2. AnalyzeDialog (Already Exists)

### Analysis Options View
```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Analyze Invoice                                        [×] │
│  Run AI analysis on invoice 01923...                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Analysis Type                                                 │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ 🧠 Complete      │  │ 🧾 Invoice Only │                  │
│  │    RECOMMENDED   │  │                  │                  │
│  │ Full analysis    │  │ Basic extraction │                  │
│  │ 🕐 2-3 minutes   │  │ 🕐 30 seconds    │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ 🛒 Items Only    │  │ 🏪 Merchant Only│                  │
│  │ Line items       │  │ Store details    │                  │
│  │ 🕐 1 minute      │  │ 🕐 20 seconds    │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                │
│  Included Features                                             │
│  [✓ OCR Extraction] [✓ Item Categorization] [✓ Merchant ID]  │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  Enhancements (Optional)                                       │
│  □ 📊 Price Comparison - Compare prices across merchants      │
│  □ ✨ Savings Tips - Get personalized savings suggestions     │
│  □ ⚡ Quick Extract - Prioritize speed over accuracy          │
│                                                                │
│  Summary                                                       │
│  📄 Complete Analysis                                          │
│     No enhancements selected                                   │
│     Estimated: 2-3 minutes                                     │
│                                                                │
│                              [Cancel] [🔍 Start Analysis]     │
└────────────────────────────────────────────────────────────────┘
```

### Analyzing View
```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Analyze Invoice                                        [×] │
│  Run AI analysis on invoice 01923...                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                        ⚡                                      │
│                   Analyzing...                                 │
│              Running OCR extraction                            │
│                                                                │
│  ████████████████████░░░░░░░░░░░░░░░░░░ 78%                 │
│                   78% complete                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. ChangeHistory Component

### With Pending Changes
```
┌────────────────────────────────────────────────────────┐
│  Change History                      [Unsaved changes] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📝 ● Name changed                          [Pending] │
│     "Old Name" → "New Name"                           │
│     Just now                                          │
│                                                        │
│     │                                                  │
│     │                                                  │
│                                                        │
│  🏷️ ● Category updated                      [Pending] │
│     Uncategorized → Grocery                           │
│     Just now                                          │
│                                                        │
│     │                                                  │
│     │                                                  │
│                                                        │
│  🕐 ● Last modified                                   │
│     2 minutes ago                                     │
│                                                        │
│     │                                                  │
│     │                                                  │
│                                                        │
│  ◉ ● Invoice created                                  │
│     March 28, 2026                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### After Saving (No Pending Changes)
```
┌────────────────────────────────────────────────────────┐
│  Change History                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  🕐 ● Last modified                                   │
│     Just now                                          │
│                                                        │
│     │                                                  │
│     │                                                  │
│                                                        │
│  ◉ ● Invoice created                                  │
│     March 28, 2026                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Mobile View (Stacked)
```
┌──────────────────────────┐
│  Change History          │
│  [Unsaved changes]       │
├──────────────────────────┤
│                          │
│  📝 ● Name changed       │
│     [Pending]            │
│     "Old" → "New"        │
│     Just now             │
│                          │
│     │                    │
│                          │
│  🏷️ ● Category updated   │
│     [Pending]            │
│     Uncategorized →      │
│     Grocery              │
│     Just now             │
│                          │
└──────────────────────────┘
```

---

## Color Scheme

### ScanGroupBanner
- **Background**: Linear gradient (primary 5% → secondary 5%)
- **Border**: Primary at 30% opacity
- **Icon wrapper**: Primary at 15% opacity
- **Text**: Foreground color
- **Button hover**: Primary at 10% opacity

### ChangeHistory
- **Container**: Card background with border
- **Timeline dots**: Primary background (solid)
- **Timeline line**: Gradient (primary 30% → border 50%)
- **Pending badge**: Primary 15% background, primary text
- **Hover**: Border changes to primary 30%

---

## Responsive Behavior

### ScanGroupBanner
- **< 640px (mobile)**: 
  - Content and actions stack vertically
  - Full-width layout
  - Reduced padding

- **≥ 640px (desktop)**:
  - Horizontal layout with space-between
  - Icon, text, and actions in one row

### ChangeHistory
- **All sizes**:
  - Timeline always vertical
  - Icons scale proportionally
  - Text wraps on small screens
  - Touch-friendly spacing on mobile

---

## Accessibility

### ScanGroupBanner
- ✅ ARIA label on dismiss button
- ✅ Keyboard navigation support
- ✅ Focus visible styles
- ✅ Semantic HTML (button elements)

### ChangeHistory
- ✅ Semantic heading structure
- ✅ Icon + text for screen readers
- ✅ Relative time formatting (human-readable)
- ✅ High contrast in dark mode

---

## Dark Mode

### ScanGroupBanner (Dark)
```
┌────────────────────────────────────────────────────────────────────┐
│ 💡  3 scans uploaded together — combine?     [Create Invoice →] [×]│
│ (Darker gradient, brighter border, higher opacity background)      │
└────────────────────────────────────────────────────────────────────┘
```
- Background: primary 15% → secondary 15%
- Border: primary 50% opacity
- Icon wrapper: primary 30% opacity

### ChangeHistory (Dark)
```
┌────────────────────────────────────────────────────────┐
│  Change History                      [Unsaved changes] │
│  (Card background at 50% opacity, timeline more visible)
├────────────────────────────────────────────────────────┤
│  (Timeline line gradient: primary 50% → border 70%)    │
│  📝 ● Name changed                          [Pending] │
│     (Text remains readable with adjusted contrast)     │
└────────────────────────────────────────────────────────┘
```
- Card background: card color at 50% opacity
- Timeline line: primary 50% → border 70%
- Pending badge: primary 30% background

---

## Animation Details

### ScanGroupBanner
- **Banner appearance**: Fade in from top (300ms ease-out)
- **Hover arrow**: TranslateX by 4px (200ms ease)
- **Dismiss**: Fade out (200ms ease)

### ChangeHistory
- **Timeline dots on hover**: Scale(1.1) transform (200ms ease)
- **Initial render**: Stagger animation for timeline items (50ms delay each)
- **Pending badge pulse**: Subtle opacity animation (2s infinite)

---

## Integration Points

### ScanGroupBanner
```tsx
// In: sites/arolariu.ro/src/app/domains/invoices/view-scans/page.tsx
import ScanGroupBanner from "./_components/ScanGroupBanner";

<div>
  <ScansHeader />
  <ScanGroupBanner />  {/* ← Add here */}
  <ScansGrid />
</div>
```

### ChangeHistory
```tsx
// In: sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx
import ChangeHistory from "./_components/ChangeHistory";

<EditInvoiceProvider>
  <div className="grid grid-cols-2">
    <div>
      <InvoiceCard />
      <MerchantCard />
    </div>
    <div>
      <ImageCard />
      <ChangeHistory />  {/* ← Add here */}
    </div>
  </div>
</EditInvoiceProvider>
```
