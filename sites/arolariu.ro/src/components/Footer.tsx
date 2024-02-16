/** @format */

import {COMMIT_SHA, SITE_URL, TIMESTAMP} from "@/constants";
import Link from "next/link";
import {FaGithub, FaLinkedin} from "react-icons/fa";

export default async function Footer() {
	return (
		<footer className="relative bottom-0 w-full bg-indigo-500">
			<svg
				className="absolute top-0 w-full h-6 -mt-5 text-indigo-500 sm:-mt-10 sm:h-16"
				preserveAspectRatio="none"
				viewBox="0 0 1440 54">
				<path
					fill="currentColor"
					d="M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z"
				/>
			</svg>

			<div className="pt-12 mx-auto text-gray-100 sm:max-w-xl md:max-w-full md:px-24 lg:max-w-screen-xl lg:px-8">
				<div className="grid gap-16 row-gap-10 mb-8 sm:grid-cols-2 lg:grid-cols-6">
					<div className=" md:col-span-1 lg:col-span-2">
						<Link
							href={SITE_URL}
							aria-label="Go home"
							title="AROLARIU.RO"
							className="inline-flex items-center 2xsm:ml-[20%] md:ml-0">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								className="w-10 h-10 p-2 bg-indigo-500 rounded-full"
								viewBox="0 0 24 24">
								<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
							</svg>
							<span className="ml-2 text-xl font-bold tracking-wide uppercase">AROLARIU.RO</span>
						</Link>
						<div className="mt-4 text-sm 2xsm:px-4 2xsm:text-center md:px-0 md:text-left">
							<p>
								The platform is built using the latest stable, state-of-the-art technologies and with enterprise-grade
								experience. <br /> <br />
								We hope that you have a great experience when exploring this platform.
							</p>
						</div>
					</div>

					<div className="flex gap-16 2xsm:flex-col 2xsm:text-center lg:flex-row lg:text-left">
						<div>
							<p className="font-semibold tracking-wide text-black">Domain Services</p>
							<ul className="mt-2 space-y-2">
								<li>
									<Link
										href={`${SITE_URL}/domains/invoices`}
										className="transition-colors duration-300 tooltip tooltip-top hover:text-teal-400"
										data-tip="Invoice Management System (IMS)">
										<span>I M S</span>
									</Link>
								</li>
								<li>
									<Link
										href={`${SITE_URL}/domains/links`}
										className="transition-colors duration-300 tooltip tooltip-top hover:text-teal-400"
										data-tip="Link Analysis & Insights System (LAIS)">
										<span>L A I S</span>
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<p className="font-semibold tracking-wide text-black">Libraries</p>
							<ul className="mt-2 space-y-2">
								<li>
									<a href="/" className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Web
									</a>
								</li>
								<li>
									<a href="/" className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										eCommerce
									</a>
								</li>
								<li>
									<a href="/" className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Business
									</a>
								</li>
								<li>
									<a href="/" className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Entertainment
									</a>
								</li>
								<li>
									<a href="/" className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Portfolio
									</a>
								</li>
							</ul>
						</div>
						<div>
							<p className="font-semibold tracking-wide text-black">Public subdomains</p>
							<ul className="mt-2 space-y-2">
								<li>
									<Link
										href="https://api.arolariu.ro"
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										<code>api.arolariu.ro</code>
									</Link>
								</li>
								<li>
									<Link
										href="https://about.arolariu.ro"
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										<code>about.arolariu.ro</code>
									</Link>
								</li>
								<li>
									<Link
										href="https://dev.arolariu.ro"
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										<code>dev.arolariu.ro</code>
									</Link>
								</li>
								<li>
									<Link
										href="https://docs.arolariu.ro"
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										<code>docs.arolariu.ro</code>
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<p className="font-semibold tracking-wide text-black">About</p>
							<ul className="mt-2 space-y-2">
								<li>
									<Link
										href={`${SITE_URL}/about/the-platform`}
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										What is <code>arolariu.ro</code>?
									</Link>
								</li>
								<li>
									<Link
										href={`${SITE_URL}/about/the-author`}
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Who is <code>arolariu</code>?
									</Link>
								</li>
								<li>
									<Link
										href={`${SITE_URL}/terms-of-service`}
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Terms of Service
									</Link>
								</li>
								<li>
									<Link
										href={`${SITE_URL}/privacy-policy`}
										className="transition-colors duration-300 text-deep-purple-50 hover:text-teal-accent-400">
										Privacy Policy
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Footer metadata information */}
				<div className="flex flex-row justify-between py-5 border-t 2xsm:flex-wrap md:flex-nowrap">
					<p className="text-sm 2xsm:text-center md:text-left">
						© Copyright 2022-{new Date().getFullYear()} Alexandru-Razvan Olariu. <br />
						<span className="ml-4">
							Source code is available{" "}
							<Link href="https://github.com/arolariu/arolariu.ro/" className="italic text-red-200">
								here (GitHub public repository)
							</Link>
							.
						</span>
					</p>
					<div className="flex flex-row items-center 2xsm:mx-auto 2xsm:mt-8 2xsm:space-x-8 md:mx-0 md:mt-0 md:space-x-4">
						<Link href="https://github.com/arolariu">
							<FaGithub className="h-7 w-7" />
						</Link>
						<Link href="https://linkedin.com/in/olariu-alexandru">
							<FaLinkedin className="h-7 w-7" />
						</Link>
					</div>
				</div>
				<p className="text-sm text-gray-600 2xsm:text-center md:text-end">
					Built on <code className="tooltip" data-tip={new Date(TIMESTAMP)}>{TIMESTAMP.split("T")[0]}</code>
					<br />
					Commit SHA: <code>{COMMIT_SHA}</code>
				</p>
			</div>
		</footer>
	);
}
