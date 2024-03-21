const Skeleton = ({className}: Readonly<{className: string}>) => (
	<div aria-live="polite" aria-busy="true" className={className}>
		<span className="inline-flex w-full leading-none bg-gray-300 rounded-md select-none animate-pulse">‌</span>
		<br />
	</div>
);

const SVGSkeleton = ({className}: Readonly<{className: string}>) => <svg className={className + " animate-pulse rounded bg-gray-300"} />;

/**
 * The loading component for the events page.
 * @returns Loading component for the events page.
 */
export default async function Loading() {
	return (
		<div>
			<section>
				<h1 className="my-8">
					<Skeleton className="w-[120px] max-w-full" />
				</h1>
				<p className="2xsm:hidden md:block">
					<Skeleton className="w-[1192px] max-w-full" />
					<code>
						<Skeleton className="w-[88px] max-w-full" />
					</code>
				</p>
			</section>
			<section className="flex flex-wrap 2xsm:gap-4 md:gap-8 md:p-4 lg:flex-nowrap">
				<a>
					<div className="shadow-lg">
						<SVGSkeleton className="h-[400px] w-[720px] object-fill object-center" />
						<div className="p-4 md:text-left">
							<h1 className="mb-2">
								<Skeleton className="w-[192px] max-w-full" />
							</h1>
							<p>
								<Skeleton className="w-[768px] max-w-full" />
							</p>
							<div className="flex items-center justify-between gap-4 mt-4 2xsm:flex-col md:flex-row">
								<div className="flex items-center">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[80px] max-w-full" />
									</p>
								</div>
								<div className="flex items-center ml-4">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[48px] max-w-full" />
									</p>
								</div>
							</div>
						</div>
					</div>
				</a>
				<a>
					<div className="shadow-lg">
						<SVGSkeleton className="h-[400px] w-[720px] object-fill object-center" />
						<div className="p-4 md:text-left">
							<h1 className="mb-2">
								<Skeleton className="w-[192px] max-w-full" />
							</h1>
							<p>
								<Skeleton className="w-[768px] max-w-full" />
							</p>
							<div className="flex items-center justify-between gap-4 mt-4 2xsm:flex-col md:flex-row">
								<div className="flex items-center">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[80px] max-w-full" />
									</p>
								</div>
								<div className="flex items-center ml-4">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[48px] max-w-full" />
									</p>
								</div>
							</div>
						</div>
					</div>
				</a>
				<a>
					<div className="shadow-lg">
						<SVGSkeleton className="h-[400px] w-[720px] object-fill object-center" />
						<div className="p-4 md:text-left">
							<h1 className="mb-2">
								<Skeleton className="w-[192px] max-w-full" />
							</h1>
							<p>
								<Skeleton className="w-[768px] max-w-full" />
							</p>
							<div className="flex items-center justify-between gap-4 mt-4 2xsm:flex-col md:flex-row">
								<div className="flex items-center">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[80px] max-w-full" />
									</p>
								</div>
								<div className="flex items-center ml-4">
									<SVGSkeleton className="w-6 h-6" />
									<p className="ml-2">
										<Skeleton className="w-[48px] max-w-full" />
									</p>
								</div>
							</div>
						</div>
					</div>
				</a>
			</section>
		</div>
	);
}
