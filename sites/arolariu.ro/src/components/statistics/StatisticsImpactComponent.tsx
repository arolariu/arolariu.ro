export default async function StatisticImpactComponent() {
	return (
		<div className="px-4 py-16 mx-auto sm:max-w-xl md:max-w-full md:px-24 lg:max-w-screen-xl lg:px-8 lg:py-20">
			<div className="flex flex-col lg:flex-row lg:items-center">
				<div className="flex items-center mb-6 lg:mb-0 lg:w-1/2">
					<div className="flex items-center justify-center w-16 h-16 mr-5 bg-indigo-500 rounded-full sm:h-24 sm:w-24 xl:mr-10 xl:h-28 xl:w-28">
						<svg
							className="w-12 h-12 text-deep-purple-accent-400 sm:h-16 sm:w-16 xl:h-20 xl:w-20"
							stroke="currentColor"
							viewBox="0 0 52 52">
							<polygon
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
								points="29 13 14 29 25 29 23 39 38 23 27 23"
							/>
						</svg>
					</div>
					<h3 className="text-4xl font-extrabold sm:text-5xl xl:text-6xl">9 312 435</h3>
				</div>
				<div className="lg:w-1/2">
					<p className="text-gray-200">
						Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
						rem aperiam, eaque ipsa quae. Lorem ipsum dolor sit amet, consectetur adipiscing elit,
						sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
					</p>
				</div>
			</div>
		</div>
	);
}
