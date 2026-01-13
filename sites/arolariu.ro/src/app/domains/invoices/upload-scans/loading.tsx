import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton for the upload scans page.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      <div className='mb-8 w-full max-w-md'>
        <Skeleton className='mx-auto mb-2 h-10 w-64' />
        <Skeleton className='mx-auto h-6 w-48' />
      </div>
      <section className='mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8'>
        <Skeleton className='mb-16 h-64 w-full rounded-lg' />
      </section>
    </main>
  );
}
