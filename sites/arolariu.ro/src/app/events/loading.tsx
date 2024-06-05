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
  <svg className={`${className} animate-pulse rounded bg-gray-300`} />
);

/**
 * The loading component for the events page.
 * @returns Loading component for the events page.
 */
export default async function Loading() {
  return (
    <div>
      <section>
        <h1 className='my-8'>
          <Skeleton className='w-[120px] max-w-full' />
        </h1>
        <div className='2xsm:hidden md:block'>
          <Skeleton className='w-[1192px] max-w-full' />
          <code>
            <Skeleton className='w-[88px] max-w-full' />
          </code>
        </div>
      </section>
      <section className='flex flex-wrap 2xsm:gap-4 md:gap-8 md:p-4 lg:flex-nowrap'>
        <div className='shadow-lg'>
          <SVGSkeleton className='h-[400px] w-[720px] object-fill object-center' />
          <div className='p-4 md:text-left'>
            <h1 className='mb-2'>
              <Skeleton className='w-[192px] max-w-full' />
            </h1>
            <Skeleton className='w-[768px] max-w-full' />
            <div className='mt-4 flex items-center justify-between gap-4 2xsm:flex-col md:flex-row'>
              <div className='flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[80px] max-w-full' />
                </div>
              </div>
              <div className='ml-4 flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[48px] max-w-full' />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='shadow-lg'>
          <SVGSkeleton className='h-[400px] w-[720px] object-fill object-center' />
          <div className='p-4 md:text-left'>
            <h1 className='mb-2'>
              <Skeleton className='w-[192px] max-w-full' />
            </h1>
            <Skeleton className='w-[768px] max-w-full' />
            <div className='mt-4 flex items-center justify-between gap-4 2xsm:flex-col md:flex-row'>
              <div className='flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[80px] max-w-full' />
                </div>
              </div>
              <div className='ml-4 flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[48px] max-w-full' />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='shadow-lg'>
          <SVGSkeleton className='h-[400px] w-[720px] object-fill object-center' />
          <div className='p-4 md:text-left'>
            <h1 className='mb-2'>
              <Skeleton className='w-[192px] max-w-full' />
            </h1>
            <Skeleton className='w-[768px] max-w-full' />
            <div className='mt-4 flex items-center justify-between gap-4 2xsm:flex-col md:flex-row'>
              <div className='flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[80px] max-w-full' />
                </div>
              </div>
              <div className='ml-4 flex items-center'>
                <SVGSkeleton className='h-6 w-6' />
                <div className='ml-2'>
                  <Skeleton className='w-[48px] max-w-full' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
