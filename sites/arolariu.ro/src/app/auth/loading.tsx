
const Skeleton = ({ className }: any) => (
  <div aria-live="polite" aria-busy="true" className={className}>
    <span className="inline-flex w-full leading-none bg-gray-300 rounded-md select-none animate-pulse">
      ‌
    </span>
    <br />
  </div>
)

const SVGSkeleton = ({ className }: any) => (
  <svg
    className={
      className + " animate-pulse rounded bg-gray-300"
    }
  />
)

export default async function Loading() {
    return (
<main>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap mx-4 mb-10">
          <div className="container px-8 mb-10 sm:w-1/2">
            <div className="flex items-center justify-center h-64">
              <SVGSkeleton className="object-cover w-[300px] h-[500px]" />
            </div>
            <h2 className="mt-6 mb-3">
              <Skeleton className="w-[208px] max-w-full" />
            </h2>
            <p className="leading-relaxed">
              <Skeleton className="w-[1960px] max-w-full" />
            </p>
            <a className="flex w-full px-5 py-2 mt-6 border-0">
              <Skeleton className="w-[64px] max-w-full" />
            </a>
          </div>
          <div className="container px-8 mb-10 sm:w-1/2">
            <div className="flex items-center justify-center h-64">
              <SVGSkeleton className="object-cover w-[300px] h-[500px]" />
            </div>
            <h2 className="mt-6 mb-3">
              <Skeleton className="w-[248px] max-w-full" />
            </h2>
            <p className="leading-relaxed">
              <Skeleton className="w-[1568px] max-w-full" />
            </p>
            <a className="flex w-full px-5 py-2 mt-6 border-0">
              <Skeleton className="w-[64px] max-w-full" />
            </a>
          </div>
        </div>
      </div>
    </main>
    )
}
