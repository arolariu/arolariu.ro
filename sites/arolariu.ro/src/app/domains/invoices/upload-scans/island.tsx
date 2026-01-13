"use client";

/**
 * @fileoverview Client-side island for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/island
 */

import {Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbArrowLeft, TbArrowRight, TbCheck, TbEye, TbFileInvoice, TbFileTypePdf, TbInfoCircle, TbPhoto, TbShieldCheck} from "react-icons/tb";
import UploadArea from "./_components/UploadArea";
import UploadPreview from "./_components/UploadPreview";
import {ScanUploadProvider, useScanUpload} from "./_context/ScanUploadContext";

/**
 * Supported file type card component.
 */
function FileTypeCard({
	icon,
	label,
	extensions,
}: Readonly<{
	icon: React.ReactNode;
	label: string;
	extensions: string;
}>): React.JSX.Element {
	return (
		<div className='flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50'>
			<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-700'>
				{icon}
			</div>
			<div>
				<p className='text-sm font-medium text-gray-900 dark:text-white'>{label}</p>
				<p className='text-xs text-gray-500 dark:text-gray-400'>{extensions}</p>
			</div>
		</div>
	);
}

/**
 * Tip item component.
 */
function TipItem({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
	return (
		<li className='flex items-start gap-2'>
			<TbCheck className='mt-0.5 h-4 w-4 shrink-0 text-green-500' />
			<span className='text-sm text-gray-600 dark:text-gray-300'>{children}</span>
		</li>
	);
}

/**
 * Upload statistics component.
 */
function UploadStats(): React.JSX.Element {
	const t = useTranslations("Domains.services.invoices.service.upload-scans");
	const {pendingUploads, sessionStats} = useScanUpload();

	// Current batch stats (from pending uploads)
	const uploading = pendingUploads.filter((u) => u.status === "uploading").length;
	const pending = pendingUploads.filter((u) => u.status === "idle").length;
	const failedInQueue = pendingUploads.filter((u) => u.status === "failed").length;

	// Session stats (persisted even after uploads complete and are removed)
	const {totalAdded, totalCompleted, totalFailed} = sessionStats;

	// Don't show if no activity this session
	if (totalAdded === 0 && pendingUploads.length === 0) return <></>;

	// Show "View Scans" button when all uploads are done (nothing pending or uploading)
	const allDone = totalCompleted > 0 && pending === 0 && uploading === 0;

	return (
		<motion.div
			initial={{opacity: 0, y: 10}}
			animate={{opacity: 1, y: 0}}
			className='mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'>
			<div className='flex flex-wrap items-center justify-between gap-4'>
				<div className='flex items-center gap-6'>
					{/* Session total */}
					<div className='text-center'>
						<p className='text-2xl font-bold text-gray-900 dark:text-white'>{totalAdded}</p>
						<p className='text-xs text-gray-500 dark:text-gray-400'>{t("stats.added")}</p>
					</div>
					{/* Pending in current batch */}
					{pending > 0 && (
						<div className='text-center'>
							<p className='text-2xl font-bold text-amber-500'>{pending}</p>
							<p className='text-xs text-gray-500 dark:text-gray-400'>{t("stats.pending")}</p>
						</div>
					)}
					{/* Currently uploading */}
					{uploading > 0 && (
						<div className='text-center'>
							<p className='text-2xl font-bold text-blue-500'>{uploading}</p>
							<p className='text-xs text-gray-500 dark:text-gray-400'>{t("stats.uploading")}</p>
						</div>
					)}
					{/* Session completed (persistent) */}
					{totalCompleted > 0 && (
						<div className='text-center'>
							<p className='text-2xl font-bold text-green-500'>{totalCompleted}</p>
							<p className='text-xs text-gray-500 dark:text-gray-400'>{t("stats.completed")}</p>
						</div>
					)}
					{/* Session failed (persistent) + current queue failures */}
					{(totalFailed > 0 || failedInQueue > 0) && (
						<div className='text-center'>
							<p className='text-2xl font-bold text-red-500'>{totalFailed + failedInQueue}</p>
							<p className='text-xs text-gray-500 dark:text-gray-400'>{t("stats.failed")}</p>
						</div>
					)}
				</div>

				{allDone && (
					<Button
						asChild
						className='bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'>
						<Link href='/domains/invoices/view-scans'>
							{t("buttons.viewScans")}
							<TbArrowRight className='ml-2 h-4 w-4' />
						</Link>
					</Button>
				)}
			</div>
		</motion.div>
	);
}

/**
 * Main upload content component (uses context).
 */
function UploadContent(): React.JSX.Element {
	const t = useTranslations("Domains.services.invoices.service.upload-scans");
	const {pendingUploads, sessionStats} = useScanUpload();

	return (
		<section className='mx-auto max-w-7xl'>
			{/* Breadcrumb */}
			<div className='mb-6'>
				<Link
					href='/domains/invoices'
					className='inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
					<TbArrowLeft className='h-4 w-4' />
					{t("breadcrumb")}
				</Link>
			</div>

			{/* Header */}
			<div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-start gap-2'>
					<div>
						<h1 className='text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white'>{t("header.title")}</h1>
						<p className='text-sm text-gray-500 dark:text-gray-400'>{t("header.description")}</p>
					</div>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type='button'
									className='mt-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'>
									<TbInfoCircle className='h-5 w-5' />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side='right'
								className='max-w-xs'>
								<p>{t("header.tooltip")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				<div className='flex gap-2'>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									asChild
									variant='outline'
									className='flex items-center gap-2'>
									<Link href='/domains/invoices/view-scans'>
										<TbEye className='h-4 w-4' />
										<span className='hidden sm:inline'>{t("buttons.viewScans")}</span>
										<span className='sm:hidden'>{t("buttons.viewScans").split(" ")[0]}</span>
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t("buttons.viewScans")}</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									asChild
									variant='outline'
									className='flex items-center gap-2'>
									<Link href='/domains/invoices/view-invoices'>
										<TbFileInvoice className='h-4 w-4' />
										<span className='hidden sm:inline'>{t("buttons.myInvoices")}</span>
										<span className='sm:hidden'>{t("buttons.myInvoices").split(" ")[0]}</span>
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t("buttons.myInvoices")}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			{/* Upload Stats (when there are pending uploads) */}
			<UploadStats />

			{/* Main Content Area */}
			<div className='grid gap-8 lg:grid-cols-3'>
				{/* Upload Area - Takes 2 columns */}
				<div className='lg:col-span-2'>
					<UploadPreview />
					<UploadArea />
				</div>

				{/* Sidebar - Info Cards */}
				<div className='space-y-6'>
					{/* Supported Formats */}
					<Card>
						<CardContent className='p-4'>
							<h3 className='mb-4 font-semibold text-gray-900 dark:text-white'>{t("sidebar.formats.title")}</h3>
							<div className='space-y-3'>
								<FileTypeCard
									icon={<TbPhoto className='h-5 w-5 text-blue-500' />}
									label={t("sidebar.formats.images")}
									extensions={t("sidebar.formats.imageExtensions")}
								/>
								<FileTypeCard
									icon={<TbFileTypePdf className='h-5 w-5 text-red-500' />}
									label={t("sidebar.formats.documents")}
									extensions={t("sidebar.formats.documentExtensions")}
								/>
							</div>
							<p className='mt-3 text-xs text-gray-500 dark:text-gray-400'>{t("sidebar.formats.maxSize")}</p>
						</CardContent>
					</Card>

					{/* Tips */}
					<Card>
						<CardContent className='p-4'>
							<h3 className='mb-4 font-semibold text-gray-900 dark:text-white'>{t("sidebar.tips.title")}</h3>
							<ul className='space-y-2'>
								<TipItem>{t("sidebar.tips.tip1")}</TipItem>
								<TipItem>{t("sidebar.tips.tip2")}</TipItem>
								<TipItem>{t("sidebar.tips.tip3")}</TipItem>
								<TipItem>{t("sidebar.tips.tip4")}</TipItem>
								<TipItem>{t("sidebar.tips.tip5")}</TipItem>
							</ul>
						</CardContent>
					</Card>

					{/* Security Note */}
					<Card className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'>
						<CardContent className='p-4'>
							<div className='flex items-start gap-3'>
								<TbShieldCheck className='mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400' />
								<div>
									<h3 className='font-semibold text-green-900 dark:text-green-100'>{t("sidebar.security.title")}</h3>
									<p className='mt-1 text-sm text-green-700 dark:text-green-300'>{t("sidebar.security.description")}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Next Steps (when all uploads completed) */}
					{sessionStats.totalCompleted > 0 && pendingUploads.length === 0 && (
						<motion.div
							initial={{opacity: 0, scale: 0.95}}
							animate={{opacity: 1, scale: 1}}
							transition={{delay: 0.3}}>
							<Card className='border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'>
								<CardContent className='p-4'>
									<h3 className='mb-2 font-semibold text-purple-900 dark:text-purple-100'>
										{t("sidebar.nextSteps.title")}
									</h3>
									<p className='mb-4 text-sm text-purple-700 dark:text-purple-300'>
										{t("sidebar.nextSteps.description")}
									</p>
									<Button
										asChild
										size='sm'
										className='w-full bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'>
										<Link href='/domains/invoices/view-scans'>
											{t("sidebar.nextSteps.button")}
											<TbArrowRight className='ml-2 h-4 w-4' />
										</Link>
									</Button>
								</CardContent>
							</Card>
						</motion.div>
					)}
				</div>
			</div>
		</section>
	);
}

/**
 * Client-side island for the scan upload workflow.
 *
 * @remarks
 * This component serves as the hydration boundary for the upload page.
 * It provides the ScanUploadContext and renders the upload UI.
 */
export default function RenderUploadScansScreen(): React.JSX.Element {
	return (
		<ScanUploadProvider>
			<UploadContent />
		</ScanUploadProvider>
	);
}
