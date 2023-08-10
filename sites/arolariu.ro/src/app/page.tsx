/** @format */

import Illustration from "@/assets/3d-illustration.png";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
	return (
		<section className="bg-black py-12 sm:pb-16 lg:pb-20 xl:pb-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="relative">
					<div className="lg:w-2/3">
						<h1 className="mt-6 text-4xl font-normal text-white sm:mt-10 sm:text-5xl lg:text-6xl xl:text-8xl">
							<span className="bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
								Welcome to <span className="font-bold">arolariu.ro</span>
							</span>{" "}
						</h1>
						<p className="mt-4 max-w-lg text-xl font-normal text-gray-400 sm:mt-8">
							This platform was built by Alexandru-Razvan Olariu as a playground for new
							technologies. The platform is built using state-of-the-art, enterprise-grade
							technologies. <br /> <br />
							You are welcome to explore all of the applications and services that are hosted on
							this domain space.
						</p>
						<div className="group relative mt-8 inline-flex items-center justify-center sm:mt-12">
							<div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-500/50"></div>
							<Link
								href="/domains"
								title=""
								className="relative inline-flex items-center justify-center rounded-full border border-transparent bg-black px-8 py-3 text-base font-normal text-white"
								role="button">
								Start Exploring
							</Link>
						</div>

						<div>
							<div className="mt-8 inline-flex items-center border-t border-gray-800 pt-6 sm:mt-14 sm:pt-10">
								<svg
									className="h-6 w-6"
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

								<span className="ml-2 text-base font-normal text-white">
									THANK YOU FOR THE TIME SPENT ON THE WEBSITE.
								</span>
							</div>
						</div>
					</div>

					<div className="mt-8 md:absolute md:right-0 md:top-32 md:mt-0 lg:top-0">
						<Image
							className="mx-auto w-full max-w-xs lg:max-w-lg xl:max-w-xl"
							src={Illustration}
							alt="Generated 3D image."
							width={640}
							height={320}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
