import Link from "next/link";

export default async function StatisticsHeroComponent() {
	const sitePath = process.env["SITE_URL"] as string;
	return (
		<div className="px-4 py-16 mx-auto sm:max-w-xl md:max-w-full md:px-24 lg:max-w-screen-xl lg:px-8 lg:py-20">
			<div className="max-w-xl mb-10 sm:text-center md:mx-auto md:mb-12 lg:max-w-2xl">
				<h1 className="max-w-lg mx-auto mb-8 text-5xl font-bold leading-5 tracking-wide text-blue-400">
					Statistics
				</h1>
				<h2 className="text-base text-gray-50 md:text-lg">
					We at{" "}
					<code className="text-purple-200">
						<Link href={sitePath}>arolariu.ro</Link>
					</code>{" "}
					are proud to share our statistics with you.
				</h2>
			</div>
			<div className="relative w-full p-px mx-auto mb-4 overflow-hidden transition-shadow duration-1000 border rounded group hover:shadow-xl lg:mb-8 lg:max-w-4xl">
				<div className="relative flex flex-col items-center h-full py-10 duration-300 bg-black rounded-sm transition-color sm:flex-row sm:items-stretch">
					<div className="px-12 py-8 text-center">
						<span className="text-4xl font-bold text-deep-purple-accent-400 sm:text-5xl">82%</span>
						<p className="text-center md:text-base">
							Lorem ipsum dolor adipiscing sit amet, consectetur elit.
						</p>
					</div>
					<div className="w-56 h-1 transition duration-300 transform bg-gray-300 rounded-full group-hover:scale-110 group-hover:bg-purple-400 sm:h-auto sm:w-1" />
					<div className="px-12 py-8 text-center">
						<span className="text-4xl font-bold text-deep-purple-accent-400 sm:text-5xl">
							106.5K
						</span>
						<p className="text-center md:text-base">
							Lorem ipsum elit consectetur sit amet, adipiscing dolor.
						</p>
					</div>
				</div>
			</div>
			<p className="mx-auto mb-4 text-gray-200 sm:text-center md:px-16 lg:mb-6 lg:max-w-2xl">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua.
			</p>
		</div>
	);
}
