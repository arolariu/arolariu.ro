export default async function StatisticsDSSComponent() {
	return (
		<div className="px-4 py-16 mx-auto sm:max-w-xl md:max-w-full md:px-24 lg:max-w-screen-xl lg:px-8 lg:py-20">
			<h1 className="mb-6 text-3xl font-extrabold odd:text-start even:text-end">
				Domain Space Service statistics:
			</h1>
			<div className="grid grid-cols-2 row-gap-8 md:grid-cols-4">
				<div className="text-center md:border-r">
					<h6 className="text-4xl font-bold lg:text-5xl xl:text-6xl">144K</h6>
					<p className="text-sm font-medium tracking-widest text-gray-200 uppercase lg:text-base">
						Downloads
					</p>
				</div>
				<div className="text-center md:border-r">
					<h6 className="text-4xl font-bold lg:text-5xl xl:text-6xl">12.9K</h6>
					<p className="text-sm font-medium tracking-widest text-gray-200 uppercase lg:text-base">
						Subscribers
					</p>
				</div>
				<div className="text-center md:border-r">
					<h6 className="text-4xl font-bold lg:text-5xl xl:text-6xl">48.3K</h6>
					<p className="text-sm font-medium tracking-widest text-gray-200 uppercase lg:text-base">
						Users
					</p>
				</div>
				<div className="text-center">
					<h6 className="text-4xl font-bold lg:text-5xl xl:text-6xl">24.5K</h6>
					<p className="text-sm font-medium tracking-widest text-gray-200 uppercase lg:text-base">
						Cookies
					</p>
				</div>
			</div>
		</div>
	);
}
