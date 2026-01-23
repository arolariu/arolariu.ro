/**
 * A server-rendered loading component that displays immediately.
 * Uses CSS animations instead of JavaScript to work during Next.js compilation.
 * Uses a div wrapper instead of main to avoid duplicate landmark violations when
 * page content also renders a main element during streaming/hydration.
 * @returns A loading component.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className='bg-background min-h-screen'>
      {/* Hero section skeleton */}
      <section className='relative min-h-screen overflow-hidden pt-20'>
        <div className='container mx-auto px-4'>
          <div className='grid min-h-[80vh] grid-cols-1 items-center gap-12 lg:grid-cols-2'>
            {/* Left side - Text with visible h1 */}
            <div className='relative z-10'>
              <div className='bg-muted mb-6 h-6 w-40 animate-pulse rounded' />
              <h1 className='text-muted-foreground mb-4 text-4xl font-bold sm:text-5xl lg:text-6xl'>
                Loading...
              </h1>
              <div className='bg-muted mb-8 h-6 w-full max-w-lg animate-pulse rounded' />
              <div className='bg-muted mb-8 h-6 w-full max-w-lg animate-pulse rounded' />
              <div className='flex flex-wrap gap-4'>
                <div className='bg-muted h-10 w-36 animate-pulse rounded' />
                <div className='bg-muted h-10 w-36 animate-pulse rounded' />
              </div>
            </div>

            {/* Right side - Sphere placeholder with CSS animation */}
            <div className='relative flex flex-col items-center justify-center'>
              <div className='relative mx-auto w-full max-w-[400px]'>
                <div className='bg-muted aspect-square w-full animate-pulse rounded-full opacity-50' />
                <div className='border-primary/30 absolute inset-0 animate-spin rounded-full border-2 [animation-duration:8s]' />
                <div className='border-primary/20 absolute inset-0 animate-spin rounded-full border [animation-direction:reverse] [animation-duration:10s]' />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology cards section */}
      <section className='relative py-20'>
        <div className='container mx-auto px-4'>
          <div className='mb-16 text-center'>
            <div className='bg-muted mx-auto mb-4 h-6 w-40 animate-pulse rounded' />
            <div className='bg-muted mx-auto mb-6 h-10 w-64 animate-pulse rounded' />
            <div className='bg-muted mx-auto h-5 w-96 animate-pulse rounded' />
          </div>

          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <div
                key={key}
                className='bg-muted h-64 w-full animate-pulse rounded-lg'
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
