"use client";

import UploadArea from "./_components/UploadArea";
import UploadPreview from "./_components/UploadPreview";
import {InvoiceCreatorProvider} from "./_context/InvoiceCreatorContext";

/**
 * Client-side island for the invoice creation workflow.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Why Client Component?**
 * - Manages complex upload state via `InvoiceCreatorProvider` context
 * - Requires user interaction for file uploads and form submission
 * - Needs immediate visual feedback during upload process
 *
 * **Architecture**:
 * This component serves as the hydration boundary (island) for the invoice
 * creation page. The parent page component remains a Server Component while
 * this island handles all interactive functionality.
 *
 * **Component Composition**:
 * - `InvoiceCreatorProvider`: Context provider managing upload state, file data, and submission logic
 * - `UploadPreview`: Displays selected invoice image/document preview
 * - `UploadArea`: Drag-and-drop zone for file selection
 *
 * **Layout**:
 * Uses responsive container with max-width constraint (7xl) and progressive
 * padding for mobile/tablet/desktop breakpoints.
 *
 * @returns Client-rendered invoice creation UI wrapped in context provider
 *
 * @example
 * ```tsx
 * // Used as a client island within a server component page
 * // app/domains/invoices/create-invoice/page.tsx
 * import RenderCreateInvoiceScreen from "./island";
 *
 * export default function CreateInvoicePage() {
 *   return <RenderCreateInvoiceScreen />;
 * }
 * ```
 *
 * @see {@link InvoiceCreatorProvider} for state management details
 * @see {@link UploadArea} for file upload interaction
 * @see {@link UploadPreview} for preview rendering
 */
export default function RenderCreateInvoiceScreen(): React.JSX.Element {
  return (
    <InvoiceCreatorProvider>
      <section className='mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8'>
        <UploadPreview />
        <UploadArea />
      </section>
    </InvoiceCreatorProvider>
  );
}
