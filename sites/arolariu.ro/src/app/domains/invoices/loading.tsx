const Skeleton = ({className}: any) => (
	<div aria-live="polite" aria-busy="true" className={className}>
		<span className="inline-flex w-full leading-none bg-gray-300 rounded-md select-none animate-pulse">‌</span>
		<br />
	</div>
);

const SVGSkeleton = ({className}: any) => <svg className={className + " animate-pulse rounded bg-gray-300"} />;

export default async function Loading() {
	return (
		<section>
			<div className="container flex flex-col items-center justify-center px-5 py-24 mx-auto">
				<SVGSkeleton className="h-[500px] w-[500px] object-cover object-center" />
				<div className="w-full mt-2 lg:w-2/3">
					<h1 className="mb-4 from-pink-400 bg-clip-text">
						<Skeleton className="w-[456px] max-w-full" />
					</h1>
					<p className="mb-8 leading-relaxed">
						<Skeleton className="w-[1560px] max-w-full" />
					</p>
					<div className="flex justify-center">
						<a className="inline-flex px-6 py-2 border-0">
							<Skeleton className="w-[112px] max-w-full" />
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
