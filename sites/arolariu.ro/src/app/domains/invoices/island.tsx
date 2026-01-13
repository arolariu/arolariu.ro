"use client";

/**
 * @fileoverview Invoice domain home page with workflow guide.
 * @module app/domains/invoices/island
 *
 * @remarks
 * This component serves as the main entry point for the invoices domain.
 * It guides users through the 3-step workflow: Upload → Organize → View.
 */

import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {motion} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {TbArrowRight, TbChartBar, TbEye, TbFileInvoice, TbPhoto, TbUpload} from "react-icons/tb";

type Props = {
	isAuthenticated: boolean;
};

/**
 * Workflow step card component.
 */
function WorkflowCard({
	step,
	title,
	description,
	icon,
	href,
	buttonText,
	gradient,
	delay,
}: Readonly<{
	step: number;
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	buttonText: string;
	gradient: string;
	delay: number;
}>): React.JSX.Element {
	return (
		<motion.div
			initial={{opacity: 0, y: 20}}
			animate={{opacity: 1, y: 0}}
			transition={{duration: 0.5, delay}}>
			<Card className='group relative h-full overflow-hidden border-2 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg dark:hover:border-indigo-700'>
				{/* Step number badge */}
				<div
					className={`absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br ${gradient} text-2xl font-bold text-white opacity-20 transition-opacity group-hover:opacity-30`}>
					{step}
				</div>

				<CardHeader className='pb-2'>
					<div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${gradient} text-white shadow-md`}>
						{icon}
					</div>
					<CardTitle className='text-xl'>{title}</CardTitle>
					<CardDescription className='text-base'>{description}</CardDescription>
				</CardHeader>

				<CardContent className='pt-2'>
					<Button
						asChild
						className={`w-full bg-linear-to-r ${gradient} text-white transition-transform group-hover:scale-[1.02]`}>
						<Link
							href={href}
							className='flex items-center justify-center gap-2'>
							{buttonText}
							<TbArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
						</Link>
					</Button>
				</CardContent>
			</Card>
		</motion.div>
	);
}

/**
 * Feature highlight component.
 */
function FeatureItem({icon, title, description}: Readonly<{icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
	return (
		<div className='flex items-start gap-4'>
			<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'>
				{icon}
			</div>
			<div>
				<h3 className='font-semibold text-gray-900 dark:text-white'>{title}</h3>
				<p className='text-sm text-gray-600 dark:text-gray-400'>{description}</p>
			</div>
		</div>
	);
}

/**
 * The invoice domain home page with workflow guide.
 *
 * @remarks
 * Guides users through the 3-step invoice management workflow:
 * 1. Upload scans (receipts, invoices, bills)
 * 2. View and organize scans, create invoices
 * 3. View, analyze, and manage invoices
 */
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
	return (
		<main className='min-h-screen'>
			{/* Hero Section */}
			<section className='relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8'>
				<div className='mx-auto max-w-7xl'>
					<div className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
						{/* Left: Content */}
						<div className='flex-1 text-center lg:text-left'>
							<motion.div
								initial={{opacity: 0, y: 20}}
								animate={{opacity: 1, y: 0}}
								transition={{duration: 0.6}}>
								<h1 className='mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white'>
									Manage Your{" "}
									<span className='bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
										Invoices
									</span>{" "}
									with Ease
								</h1>
								<p className='mb-8 max-w-2xl text-lg text-gray-600 lg:text-xl dark:text-gray-300'>
									Upload your receipts and bills, organize them into invoices, and gain insights into your spending habits.
									Our AI-powered system extracts data automatically.
								</p>

								<div className='flex flex-col items-center gap-4 sm:flex-row lg:justify-start'>
									<Button
										asChild
										size='lg'
										className='bg-linear-to-r from-indigo-600 to-purple-600 px-8 text-white hover:from-indigo-700 hover:to-purple-700'>
										<Link href='/domains/invoices/upload-scans'>
											<TbUpload className='mr-2 h-5 w-5' />
											Get Started
										</Link>
									</Button>
									{isAuthenticated && (
										<Button
											asChild
											variant='outline'
											size='lg'>
											<Link href='/domains/invoices/view-invoices'>
												<TbFileInvoice className='mr-2 h-5 w-5' />
												View My Invoices
											</Link>
										</Button>
									)}
								</div>
							</motion.div>
						</div>

						{/* Right: Image */}
						<motion.div
							className='flex-1'
							initial={{opacity: 0, scale: 0.95}}
							animate={{opacity: 1, scale: 1}}
							transition={{duration: 0.6, delay: 0.2}}>
							<Image
								src='/images/domains/invoices/invoice-top.svg'
								alt='Invoice management illustration'
								width={500}
								height={500}
								className='mx-auto w-full max-w-md lg:max-w-lg'
								priority
							/>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Workflow Section */}
			<section className='bg-gray-50 px-4 py-16 sm:px-6 lg:px-8 dark:bg-gray-900/50'>
				<div className='mx-auto max-w-7xl'>
					<motion.div
						className='mb-12 text-center'
						initial={{opacity: 0, y: 20}}
						animate={{opacity: 1, y: 0}}
						transition={{duration: 0.5}}>
						<h2 className='mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white'>How It Works</h2>
						<p className='mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400'>
							Three simple steps to digitize and organize your financial documents
						</p>
					</motion.div>

					<div className='grid gap-8 md:grid-cols-3'>
						<WorkflowCard
							step={1}
							title='Upload Scans'
							description='Drag and drop your receipts, invoices, or bills. We support JPG, PNG, and PDF files up to 10MB each.'
							icon={<TbUpload className='h-6 w-6' />}
							href='/domains/invoices/upload-scans'
							buttonText='Upload Now'
							gradient='from-blue-500 to-cyan-500'
							delay={0.1}
						/>

						<WorkflowCard
							step={2}
							title='View & Organize'
							description='Review your uploaded scans, select the ones you want, and create invoices from them individually or in batches.'
							icon={<TbEye className='h-6 w-6' />}
							href='/domains/invoices/view-scans'
							buttonText='View Scans'
							gradient='from-purple-500 to-pink-500'
							delay={0.2}
						/>

						<WorkflowCard
							step={3}
							title='Manage Invoices'
							description='View your invoices, analyze spending patterns, and get AI-powered insights into your financial habits.'
							icon={<TbFileInvoice className='h-6 w-6' />}
							href='/domains/invoices/view-invoices'
							buttonText='View Invoices'
							gradient='from-green-500 to-emerald-500'
							delay={0.3}
						/>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className='px-4 py-16 sm:px-6 lg:px-8'>
				<div className='mx-auto max-w-7xl'>
					<div className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
						{/* Left: Image */}
						<motion.div
							className='flex-1'
							initial={{opacity: 0, x: -20}}
							animate={{opacity: 1, x: 0}}
							transition={{duration: 0.6}}>
							<Image
								src='/images/domains/invoices/invoice-bottom.svg'
								alt='Invoice features illustration'
								width={500}
								height={500}
								className='mx-auto w-full max-w-md lg:max-w-lg'
							/>
						</motion.div>

						{/* Right: Features */}
						<motion.div
							className='flex-1 space-y-8'
							initial={{opacity: 0, x: 20}}
							animate={{opacity: 1, x: 0}}
							transition={{duration: 0.6, delay: 0.2}}>
							<div>
								<h2 className='mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white'>
									Powerful Features
								</h2>
								<p className='text-lg text-gray-600 dark:text-gray-400'>
									Everything you need to manage your invoices efficiently
								</p>
							</div>

							<div className='space-y-6'>
								<FeatureItem
									icon={<TbPhoto className='h-5 w-5' />}
									title='Smart OCR Extraction'
									description='Our AI automatically extracts merchant names, dates, amounts, and line items from your scans.'
								/>
								<FeatureItem
									icon={<TbChartBar className='h-5 w-5' />}
									title='Spending Analytics'
									description='Get detailed insights into your spending patterns with charts and reports.'
								/>
								<FeatureItem
									icon={<TbFileInvoice className='h-5 w-5' />}
									title='Batch Processing'
									description='Process multiple scans at once - create individual invoices or combine them into one.'
								/>
							</div>

							{!isAuthenticated && (
								<div className='rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30'>
									<p className='text-sm text-indigo-800 dark:text-indigo-200'>
										<strong>Sign in</strong> to save your invoices permanently and access them from any device.
									</p>
								</div>
							)}
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className='bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-16 sm:px-6 lg:px-8'>
				<div className='mx-auto max-w-4xl text-center'>
					<motion.div
						initial={{opacity: 0, y: 20}}
						animate={{opacity: 1, y: 0}}
						transition={{duration: 0.5}}>
						<h2 className='mb-4 text-3xl font-bold text-white sm:text-4xl'>Ready to Get Started?</h2>
						<p className='mb-8 text-lg text-indigo-100'>
							Upload your first scan and see how easy invoice management can be.
						</p>
						<Button
							asChild
							size='lg'
							variant='secondary'
							className='bg-white px-8 text-indigo-600 hover:bg-gray-100'>
							<Link href='/domains/invoices/upload-scans'>
								<TbUpload className='mr-2 h-5 w-5' />
								Upload Your First Scan
							</Link>
						</Button>
					</motion.div>
				</div>
			</section>
		</main>
	);
}
