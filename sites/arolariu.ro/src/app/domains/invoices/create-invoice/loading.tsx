import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton component for the invoice creation page.
 *
 * @remarks
 * **Rendering Context**: Server Component rendered during Suspense fallback.
 *
 * **Purpose**: Provides a visual placeholder matching the layout structure of
 * the invoice creation page (island.tsx) while content loads, authentication
 * checks complete, or client components hydrate.
 *
 * **Layout Structure**:
 * - Centered main container matching page layout
 * - Upload area skeleton (large dashed border box)
 * - Optional disclaimer text skeleton (for unauthenticated state)
 *
 * **Performance**: Improves perceived performance by showing the upload interface
 * structure immediately, reducing layout shift when the actual upload components
 * (UploadArea, UploadPreview) mount and hydrate.
 *
 * **Accessibility**: Maintains semantic HTML structure and layout consistency
 * with the actual content for a seamless loading experience.
 *
 * **Next.js Integration**: Used by the Suspense boundary in layout.tsx as the
 * fallback UI while:
 * - Page component renders on server
 * - Authentication status is fetched via fetchAaaSUserFromAuthService
 * - Client components and heavy dependencies load (react-dropzone, motion)
 * - InvoiceCreatorProvider context initializes
 *
 * **User Experience**: The skeleton provides immediate visual feedback that the
 * upload interface is loading, especially important for unauthenticated users
 * who may see a disclaimer message.
 *
 * @returns Server-rendered JSX element with skeleton placeholders matching
 * the invoice creation page layout structure.
 *
 * @example
 * ```tsx
 * // Automatically rendered by Suspense boundary:
 * // <Suspense fallback={<Loading />}>
 * //   <CreateInvoicePage />
 * // </Suspense>
 * //
 * // User sees:
 * // 1. Main container with centered layout
 * // 2. Large upload area skeleton (dashed border box)
 * // 3. Disclaimer skeleton (shown for all users during load)
 * // 4. Actual content replaces skeleton when ready
 * ```
 *
 * @see {@link RenderCreateInvoiceScreen} - The actual client component being loaded
 * @see {@link CreateInvoicePage} - The parent server component with auth check
 * @see {@link InvoiceCreatorProvider} - Context provider for upload state
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      {/* Upload Interface Container Skeleton */}
      <section className='mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8'>
        {/* Upload Area Skeleton - Large Dashed Border Box */}
        <div className='mb-16 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-16 dark:border-gray-600 dark:bg-gray-900/50'>
          <div className='flex flex-col items-center justify-center space-y-6'>
            {/* Upload Icon Skeleton */}
            <Skeleton className='h-16 w-16 rounded-full' />

            {/* Upload Text Skeleton */}
            <div className='space-y-2'>
              <Skeleton className='mx-auto h-8 w-64' />
              <Skeleton className='mx-auto h-4 w-96' />
            </div>

            {/* Browse Button Skeleton */}
            <Skeleton className='h-10 w-40 rounded-md' />

            {/* Supported Formats Text Skeleton */}
            <Skeleton className='h-3 w-72' />
          </div>
        </div>
      </section>

      {/* Disclaimer Skeleton (always shown during loading) */}
      <Skeleton className='h-6 w-96' />
    </main>
  );
}
