import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton for the view scans page.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='min-h-screen px-5 py-24'>
      <section className='mx-auto max-w-7xl'>
        {/* Header skeleton */}
        <main className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <main>
            <Skeleton className='mb-2 h-8 w-48' />
            <Skeleton className='h-4 w-32' />
          </main>
          <Skeleton className='h-10 w-40' />
        </main>

        {/* Grid skeleton */}
        <main className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({length: 8}).map((_, i) => (
            <main
              key={`skeleton-${String(i)}`}
              className='overflow-hidden rounded-lg border'>
              <Skeleton className='aspect-[4/3]' />
              <main className='p-3'>
                <Skeleton className='mb-2 h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </main>
            </main>
          ))}
        </main>
      </section>
    </main>
  );
}
