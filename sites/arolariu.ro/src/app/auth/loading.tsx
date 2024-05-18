/** @format */

const Skeleton = ({className}: Readonly<{className: string}>) => (
  <div
    aria-live='polite'
    aria-busy='true'
    className={className}>
    <span className='inline-flex w-full animate-pulse select-none rounded-md bg-gray-300 leading-none'>‌</span>
    <br />
  </div>
);

const SVGSkeleton = ({className}: Readonly<{className: string}>) => (
  <svg className={className + " animate-pulse rounded bg-gray-300"} />
);

/**
 * This function renders the loading screen for the auth pages.
 * @returns The loading screen for the auth pages.
 */
export default async function Loading() {
  return (
    <main>
      <div className='container mx-auto px-5 py-24'>
        <div className='mx-4 mb-10 flex flex-wrap'>
          <div className='container mb-10 px-8 sm:w-1/2'>
            <div className='flex h-64 items-center justify-center'>
              <SVGSkeleton className='h-[500px] w-[300px] object-cover' />
            </div>
            <h2 className='mb-3 mt-6'>
              <Skeleton className='w-[208px] max-w-full' />
            </h2>
            <div className='leading-relaxed'>
              <Skeleton className='w-[1960px] max-w-full' />
            </div>
            <div className='mt-6 flex w-full border-0 px-5 py-2'>
              <Skeleton className='w-[64px] max-w-full' />
            </div>
          </div>
          <div className='container mb-10 px-8 sm:w-1/2'>
            <div className='flex h-64 items-center justify-center'>
              <SVGSkeleton className='h-[500px] w-[300px] object-cover' />
            </div>
            <h2 className='mb-3 mt-6'>
              <Skeleton className='w-[248px] max-w-full' />
            </h2>
            <div className='leading-relaxed'>
              <Skeleton className='w-[1568px] max-w-full' />
            </div>
            <div className='mt-6 flex w-full border-0 px-5 py-2'>
              <Skeleton className='w-[64px] max-w-full' />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
