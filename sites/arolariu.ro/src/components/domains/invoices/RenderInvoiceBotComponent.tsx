/** @format */

"use client";

import InvoicePageBottomSVG from "@/assets/InvoicePageBottomSVG";

export default function RenderInvoiceBotComponent() {
	return (
		<section className="dark:text-gray-200">
			<div className="container mx-auto flex flex-wrap px-5 py-24">
				<div className="flex w-full flex-wrap">
					<div className="md:w-1/2 md:py-6 md:pr-10 lg:w-2/5">
						<div className="relative flex pb-12">
							<div className="absolute inset-0 flex h-full w-10 items-center justify-center">
								<div className="pointer-events-none h-full w-1 bg-gray-200"></div>
							</div>
							<div className="relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500">
								<svg
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									className="h-5 w-5"
									viewBox="0 0 24 24">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
								</svg>
							</div>
							<div className="flex-grow pl-4">
								<h2 className="title-font mb-1 text-sm font-medium tracking-wider dark:text-gray-300">
									STEP 1 - Onboard yourself
								</h2>
								<p className="leading-relaxed">
									Create an account so that you can store your own receipts securely onto our
									platform. We adhere to the industry standards in terms of security. Your receipt
									information is{" "}
									<strong
										className="tooltip tooltip-right text-red-600"
										data-tip="TODO: some text should go here.">
										<span className="font-mono text-lg">safe</span>
									</strong>
									.
								</p>
							</div>
						</div>
						<div className="relative flex pb-12">
							<div className="absolute inset-0 flex h-full w-10 items-center justify-center">
								<div className="pointer-events-none h-full w-1 bg-gray-200"></div>
							</div>
							<div className="relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500">
								<svg
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									className="h-5 w-5"
									viewBox="0 0 24 24">
									<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
								</svg>
							</div>
							<div className="flex-grow pl-4">
								<h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-300">
									STEP 2 - Start your journey
								</h2>
								<p className="leading-relaxed">
									Upload your paper receipt. The system will then perform the full analysis. We try
									as much as possible to have a fully automated process, but sometimes we may need
									your help.
								</p>
							</div>
						</div>
						<div className="relative flex pb-12">
							<div className="absolute inset-0 flex h-full w-10 items-center justify-center">
								<div className="pointer-events-none h-full w-1 bg-gray-200"></div>
							</div>
							<div className="relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500">
								<svg
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									className="h-5 w-5"
									viewBox="0 0 24 24">
									<circle cx="12" cy="5" r="3"></circle>
									<path d="M12 22V8M5 12H2a10 10 0 0020 0h-3"></path>
								</svg>
							</div>
							<div className="flex-grow pl-4">
								<h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-300">
									STEP 3 - Explore the digital receipt
								</h2>
								<p className="leading-relaxed">
									Delve into the analysis provided by us. You can download the full analysis report
									as a PDF file for your own records.
								</p>
							</div>
						</div>
						<div className="relative flex pb-12">
							<div className="absolute inset-0 flex h-full w-10 items-center justify-center">
								<div className="pointer-events-none h-full w-1 bg-gray-200"></div>
							</div>
							<div className="relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500">
								<svg
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									className="h-5 w-5"
									viewBox="0 0 24 24">
									<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
									<circle cx="12" cy="7" r="4"></circle>
								</svg>
							</div>
							<div className="flex-grow pl-4">
								<h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-300">
									STEP 4 - Gather powerful knowledge
								</h2>
								<p className="leading-relaxed">
									Augment your analysis with our AI-powered insights. Collect knowledge into your
									purchase habits and discover new recipes specifically crafted from your day-to-day
									shopping list.
								</p>
							</div>
						</div>
						<div className="relative flex">
							<div className="relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500">
								<svg
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									className="h-5 w-5"
									viewBox="0 0 24 24">
									<path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
									<path d="M22 4L12 14.01l-3-3"></path>
								</svg>
							</div>
							<div className="flex-grow pl-4">
								<h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-300">
									STEP 5 - Offer your feedback
								</h2>
								<p className="leading-relaxed">
									We aim to create one of the best, open-source receipt-scanning platform. We would
									love to hear your feedback on how we can improve our platform.
								</p>
							</div>
						</div>
					</div>
					<div className="m-auto pt-4">
						<InvoicePageBottomSVG className="object-cover object-center" />
					</div>
				</div>
			</div>
		</section>
	);
}
