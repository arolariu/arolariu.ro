/** @format */

import InvoicePageBottomSVG from "@/assets/InvoicePageBottomSVG";
import InvoicePageTopSVG from "@/assets/InvoicePageTopSVG";
import {Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Invoice Management System",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function InvoicePage() {
	return (
		<main>
			<section className="dark:text-gray-200">
				<div className="container flex flex-col items-center justify-center px-5 py-24 mx-auto">
					<InvoicePageTopSVG className="object-cover object-center w-full" />
					<div className="w-full mt-2 text-center lg:w-2/3">
						<h1 className="mb-4 text-3xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-4xl">
							Turn your paper receipts into powerful digital knowledge.
						</h1>
						<p className="mb-8 leading-relaxed">
							Receipts are great for keeping your own accounting. However, what if you could upload
							these receipts somewhere, and get powerful insights into your habits? What if you
							could automatically get a list of all the products you bought in the last year? <br />
							<br />
							Unleash the power of our platform!
							<br />
							Throw away the Excel tables and hop on the digital train now!
						</p>
						<div className="flex justify-center">
							<Link
								href="/domains/invoices/create-invoice"
								className="inline-flex px-6 py-2 text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
								Upload receipt
							</Link>
							<Link
								href="/domains/invoices/view-invoices"
								className="inline-flex px-6 py-2 ml-4 text-lg text-gray-700 bg-gray-100 border-0 rounded hover:bg-gray-200 focus:outline-none">
								My receipts
							</Link>
						</div>
					</div>
				</div>
			</section>
			<section className="dark:text-gray-200">
				<div className="container flex flex-wrap px-5 py-24 mx-auto">
					<div className="flex flex-wrap w-full">
						<div className="md:w-1/2 md:py-6 md:pr-10 lg:w-2/5">
							<div className="relative flex pb-12">
								<div className="absolute inset-0 flex items-center justify-center w-10 h-full">
									<div className="w-1 h-full bg-gray-200 pointer-events-none"></div>
								</div>
								<div className="relative z-10 inline-flex items-center justify-center flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full">
									<svg
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
									</svg>
								</div>
								<div className="flex-grow pl-4">
									<h2 className="mb-1 text-sm font-medium tracking-wider title-font dark:text-gray-300">
										STEP 1 - Onboard yourself
									</h2>
									<p className="leading-relaxed">
										Create an account so that you can store your own receipts securely onto our
										platform. We adhere to the industry standards in terms of security. Your receipt
										information is{" "}
										<strong
											className="text-red-600 tooltip tooltip-right"
											data-tip="The receipt information is only accessible to you. You can, however, make your invoice public, so that others can see the data on it.">
											<span className="font-mono text-lg">safe</span>
										</strong>
										.
									</p>
								</div>
							</div>
							<div className="relative flex pb-12">
								<div className="absolute inset-0 flex items-center justify-center w-10 h-full">
									<div className="w-1 h-full bg-gray-200 pointer-events-none"></div>
								</div>
								<div className="relative z-10 inline-flex items-center justify-center flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full">
									<svg
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
									</svg>
								</div>
								<div className="flex-grow pl-4">
									<h2 className="mb-1 text-sm font-medium tracking-wider text-gray-300 title-font">
										STEP 2 - Start your journey
									</h2>
									<p className="leading-relaxed">
										Upload your paper receipt. The system will then perform the full analysis. We
										try as much as possible to have a fully automated process, but sometimes we may
										need your help.
									</p>
								</div>
							</div>
							<div className="relative flex pb-12">
								<div className="absolute inset-0 flex items-center justify-center w-10 h-full">
									<div className="w-1 h-full bg-gray-200 pointer-events-none"></div>
								</div>
								<div className="relative z-10 inline-flex items-center justify-center flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full">
									<svg
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<circle cx="12" cy="5" r="3"></circle>
										<path d="M12 22V8M5 12H2a10 10 0 0020 0h-3"></path>
									</svg>
								</div>
								<div className="flex-grow pl-4">
									<h2 className="mb-1 text-sm font-medium tracking-wider text-gray-300 title-font">
										STEP 3 - Explore the digital receipt
									</h2>
									<p className="leading-relaxed">
										Delve into the analysis provided by us. You can download the full analysis
										report as a PDF file for your own records.
									</p>
								</div>
							</div>
							<div className="relative flex pb-12">
								<div className="absolute inset-0 flex items-center justify-center w-10 h-full">
									<div className="w-1 h-full bg-gray-200 pointer-events-none"></div>
								</div>
								<div className="relative z-10 inline-flex items-center justify-center flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full">
									<svg
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
										<circle cx="12" cy="7" r="4"></circle>
									</svg>
								</div>
								<div className="flex-grow pl-4">
									<h2 className="mb-1 text-sm font-medium tracking-wider text-gray-300 title-font">
										STEP 4 - Gather powerful knowledge
									</h2>
									<p className="leading-relaxed">
										Augment your analysis with our AI-powered insights. Collect knowledge into your
										purchase habits and discover new recipes specifically crafted from your
										day-to-day shopping list.
									</p>
								</div>
							</div>
							<div className="relative flex">
								<div className="relative z-10 inline-flex items-center justify-center flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full">
									<svg
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
										<path d="M22 4L12 14.01l-3-3"></path>
									</svg>
								</div>
								<div className="flex-grow pl-4">
									<h2 className="mb-1 text-sm font-medium tracking-wider text-gray-300 title-font">
										STEP 5 - Offer your feedback
									</h2>
									<p className="leading-relaxed">
										We aim to create one of the best, open-source receipt-scanning platform. We
										would love to hear your feedback on how we can improve our platform.
									</p>
								</div>
							</div>
						</div>
						<div className="pt-4 m-auto">
							<InvoicePageBottomSVG className="object-cover object-center w-full" />
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
