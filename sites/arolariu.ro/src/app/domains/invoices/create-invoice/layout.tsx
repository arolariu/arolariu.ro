import {Suspense} from "react";
import Loading from "./loading";

/**
 * Layout component for the invoice creation page.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js App Router layout).
 *
 * **Purpose**: Provides a Suspense boundary specifically for the invoice creation
 * workflow. This layout wraps the create-invoice page and ensures proper loading
 * states during authentication checks and page initialization.
 *
 * **Suspense Integration**: Explicitly wraps children in a Suspense boundary with
 * the invoice creation loading skeleton as fallback. This provides visual feedback
 * while:
 * - Authentication status is being fetched from the backend
 * - Page content is being streamed from the server
 * - Client components (upload area, preview) are hydrating
 * - Heavy dependencies (react-dropzone, motion) are loading
 *
 * **Performance Benefits**:
 * - **Streaming SSR**: Shell loads immediately, content follows
 * - **Code Splitting**: Upload components load separately
 * - **Progressive Enhancement**: Skeleton → interactive upload interface
 * - **Better UX**: Immediate feedback during authentication and hydration
 *
 * **Architecture**: Part of the invoices bounded context (RFC 2001). This layout
 * inherits from:
 * - Root layout (global shell, providers)
 * - Domains layout (domain-level shell)
 * - Invoices layout (invoices-specific shell)
 *
 * **Loading State**: Uses a specialized skeleton that matches the upload interface
 * structure (upload area placeholder and optional preview section).
 *
 * @param props - Component props
 * @param props.children - Child components (page.tsx with upload interface)
 *
 * @returns Server-rendered JSX element with Suspense-wrapped children
 *
 * @example
 * ```tsx
 * // Route hierarchy:
 * // /domains/invoices/create-invoice → layout.tsx → Suspense → page.tsx → island.tsx
 * //                                                      ↓
 * //                                                  loading.tsx
 * //
 * // Rendering flow:
 * // 1. Layout renders with Suspense boundary
 * // 2. Loading skeleton displays (upload area placeholder)
 * // 3. Authentication check completes on server
 * // 4. Page content streams in with disclaimer if needed
 * // 5. Upload components hydrate for drag-and-drop functionality
 * ```
 *
 * @see {@link Loading} - Upload interface skeleton component
 * @see {@link CreateInvoicePage} - Main invoice creation page with auth check
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 */
export default function CreateInvoiceLayout(props: Readonly<LayoutProps<"/domains/invoices/create-invoice">>): React.JSX.Element {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
