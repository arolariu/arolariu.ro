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
 * This function renders the loading screen for the invoices domain.
 * @returns The loading screen for the invoices domain.
 */
export default async function Loading() {
  return (
    <section>
      <div className='container mx-auto flex flex-col items-center justify-center px-5 py-24'>
        <SVGSkeleton className='h-[500px] w-[500px] object-cover object-center' />
        <div className='mt-2 w-full lg:w-2/3'>
          <h1 className='mb-4 from-pink-400 bg-clip-text'>
            <Skeleton className='w-[456px] max-w-full' />
          </h1>
          <div className='mb-8 leading-relaxed'>
            <Skeleton className='w-[1560px] max-w-full' />
          </div>
          <div className='flex justify-center'>
            <a className='inline-flex border-0 px-6 py-2'>
              <Skeleton className='w-[112px] max-w-full' />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
