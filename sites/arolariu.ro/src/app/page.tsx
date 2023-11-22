/** @format */

import Image from "next/image";
import Link from "next/link";
import {SiCsharp, SiGithubactions, SiMicrosoftazure, SiNextdotjs, SiOpentelemetry, SiSvelte} from "react-icons/si";

export default async function Home() {
	return (
		<main>
			<section className="py-12 bg-black sm:pb-16 lg:pb-20 xl:pb-24">
				<div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
					<div className="relative">
						<div className="lg:w-2/3">
							<h1 className="mt-6 text-4xl font-normal text-white sm:mt-10 sm:text-5xl lg:text-6xl xl:text-8xl">
								<span className="text-transparent bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text">
									Welcome to <span className="font-bold">arolariu.ro</span>
								</span>{" "}
							</h1>
							<p className="max-w-lg mt-4 text-xl font-normal text-gray-400 sm:mt-8">
								This platform was built by Alexandru-Razvan Olariu as a playground for new technologies. The platform is
								built using state-of-the-art, enterprise-grade technologies. <br /> <br />
								You are welcome to explore all of the applications and services that are hosted on this domain space.
							</p>
							<div className="relative inline-flex items-center justify-center mt-8 group sm:mt-12">
								<div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:shadow-lg group-hover:shadow-cyan-500/50"></div>
								<Link
									href="/domains"
									title=""
									className="relative inline-flex items-center justify-center px-8 py-3 text-base font-normal text-white bg-black border border-transparent rounded-full"
									role="button">
									Start Exploring
								</Link>
							</div>

							<div>
								<div className="inline-flex items-center pt-6 mt-8 border-t border-gray-800 sm:mt-14 sm:pt-10">
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

									<span className="ml-2 text-base font-normal text-white">
										THANK YOU FOR THE TIME SPENT ON THE WEBSITE.
									</span>
								</div>
							</div>
						</div>

						<div className="mt-8 md:absolute md:right-0 md:top-32 md:mt-0 lg:top-0">
							<Image
								className="w-full max-w-xs mx-auto lg:max-w-lg xl:max-w-xl"
								src="/images/3d-illustration.png"
								alt="Generated 3D image."
								width={640}
								height={320}
							/>
						</div>
					</div>
				</div>
			</section>

			<section className="text-white bg-black">
				<div className="max-w-screen-xl px-4 py-8 mx-auto sm:px-6 sm:py-12 lg:px-8 lg:py-16">
					<div className="max-w-lg mx-auto text-center">
						<h2 className="text-3xl font-bold sm:text-4xl">Key Features</h2>

						<p className="mt-4 text-gray-300">
							The `arolariu.ro` platform is built using the latest stable technologies.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-8 mt-8 md:grid-cols-2 lg:grid-cols-3">
						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="https://nextjs.org">
							<div>
								<SiNextdotjs className="inline w-10 h-10" /> <span className="ml-2 text-xl">Next.JS v14</span>
							</div>
							<p className="mt-3 text-gray-300 text-md">
								The platform is built using NextJS - the most popular React framework for production.
							</p>
						</Link>

						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="https://portal.azure.com">
							<SiMicrosoftazure className="inline w-10 h-10" /> <span className="ml-2 text-xl">Microsoft Azure</span>
							<p className="mt-3 text-gray-300 text-md">
								The Microsoft Azure cloud is used to host the platform and all of its services. This ensures that the
								platform is always available and that it can scale on demand.
							</p>
						</Link>

						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="https://learn.microsoft.com/en-us/dotnet">
							<SiCsharp className="inline w-10 h-10" /> <span className="ml-2 text-xl">.NET 8 Ecosystem</span>
							<p className="mt-3 text-gray-300 text-md">
								The backend services are built using the latest LTS version of .NET: 8.
								<br /> <span className="font-mono">(ASP.NET 8, EF Core 8, etc.)</span>
							</p>
						</Link>

						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="https://svelte.dev">
							<SiSvelte className="inline w-10 h-10" /> <span className="ml-2 text-xl">Svelte</span>
							<p className="mt-3 text-gray-300 text-md">
								The{" "}
								<Link href="https://cv.arolariu.ro">
									<code className="mx-4">cv.arolariu.ro</code>
								</Link>{" "}
								platform is built exclusively using Svelte and SvelteKit (v5).
							</p>
						</Link>

						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="https://opentelemetry.io">
							<SiOpentelemetry className="inline w-10 h-10" /> <span className="ml-2 text-xl">OpenTelemetry</span>
							<p className="mt-3 text-gray-300 text-md">
								Everything is instrumented using OpenTelemetry. This allows for a unified telemetry experience across
								the board. <br /> <span className="font-mono">(3PO: metrics, logs, traces)</span>
							</p>
						</Link>

						<Link
							className="block p-8 transition border border-gray-800 shadow-xl rounded-xl hover:border-pink-500/10 hover:shadow-pink-500/10"
							href="/services/digital-campaigns">
							<SiGithubactions className="inline w-10 h-10" />{" "}
							<span className="ml-2 text-xl">GitHub Actions (DevOps)</span>
							<p className="mt-3 text-gray-300 text-md">
								The DevOps experience is powered by GitHub Actions. <br />{" "}
								<span className="font-mono">(CI/CD, Testing, etc.)</span>
							</p>
						</Link>
					</div>
					<Link href="/about" className="block mx-auto mt-8 text-center">
						<button type="button" className="text-white text-md btn btn-primary">Interesting? Click here to learn more...</button>
					</Link>
				</div>
			</section>
		</main>
	);
}
