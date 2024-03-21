import FeaturesList from "@/components/Features/FeaturesList";
import Image from "next/image";
import Link from "next/link";

/**
 * The home page component.
 * @returns The home page component.
 */
export default async function Home() {
	return (
		<main>
			<section className="py-12 sm:pb-16 lg:pb-20 xl:pb-24">
				<div className="relative mx-auto max-w-full px-4 sm:px-6 lg:px-8 2xl:max-w-[120rem]">
			<div>
				<h1 className="mt-6 text-4xl font-normal text-white 2xsm:text-center sm:mt-10 sm:text-5xl md:text-left lg:text-6xl xl:text-8xl">
					<span className="text-transparent bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text">
						Welcome to <span className="font-bold">arolariu.ro</span>
					</span>
				</h1>
				<p className="max-w-lg mt-4 text-xl text-gray-500 lg:max-w-2xl 2xsm:text-center md:text-left">
					This platform was built by Alexandru-Razvan Olariu as a playground for new technologies. The platform is built
					using state-of-the-art, enterprise-grade technologies. <br /> <br />
					You are welcome to explore all of the applications and services that are hosted on this domain space.
				</p>
				<div className="relative inline-flex mt-8 2xsm:ml-[26%] md:ml-0">
					<div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:shadow-lg group-hover:shadow-cyan-500/50"/>
					<Link
						href="/domains"
						title=""
						className="relative inline-flex px-8 py-3 text-white bg-black border border-transparent rounded-full">
						Start Exploring
					</Link>
				</div>

				<div>
					<div className="inline-flex items-center pt-6 mt-8 border-t border-gray-800 dark:border-gray-300">
						<svg
							className="w-6 h-6"
							viewBox="0 0 24 24"
							fill="none"
							strokeWidth="1.5"
							xmlns="http://www.w3.org/2000/svg">
							<path
								d="M13 7.00003H21M21 7.00003V15M21 7.00003L13 15L9 11L3 17"
								stroke="url(#a)"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>

						<span className="2xsm:text-center md:text-left">THANK YOU FOR THE TIME SPENT ON THE WEBSITE.</span>
					</div>
				</div>
			</div>

			<div className="2xsm:hidden xl:absolute xl:right-0 xl:top-0 xl:block">
				<Image src="/images/3d-illustration.png" alt="Generated 3D image." width={640} height={320} priority />
			</div>
		</div>
			</section> {/* Hero section */}

			<section className="py-12 sm:pb-16 lg:pb-20 xl:pb-24">
				<FeaturesList />
			</section> {/* Features section */}
		</main>
	);
}
