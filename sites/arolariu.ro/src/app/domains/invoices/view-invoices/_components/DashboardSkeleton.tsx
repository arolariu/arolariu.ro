/** @format */

export function DashboardSkeleton() {
  return (
    <div className='container mx-auto space-y-8 py-6'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='bg-muted h-8 w-64 animate-pulse rounded-md' />
          <div className='bg-muted mt-2 h-4 w-48 animate-pulse rounded-md' />
        </div>
        <div className='flex gap-2'>
          <div className='bg-muted h-9 w-24 animate-pulse rounded-md' />
          <div className='bg-muted h-9 w-24 animate-pulse rounded-md' />
        </div>
      </div>

      <div className='bg-muted h-10 w-64 animate-pulse rounded-md' />

      <div className='space-y-4'>
        <div className='flex justify-between'>
          <div className='bg-muted h-10 w-48 animate-pulse rounded-md' />
          <div className='bg-muted h-10 w-48 animate-pulse rounded-md' />
        </div>

        <div className='rounded-lg border p-4'>
          <div className='space-y-4'>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between'>
                  <div className='bg-muted h-12 w-64 animate-pulse rounded-md' />
                  <div className='bg-muted h-8 w-24 animate-pulse rounded-md' />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
