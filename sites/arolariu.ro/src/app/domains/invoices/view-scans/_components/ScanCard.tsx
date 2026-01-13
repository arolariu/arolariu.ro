"use client";

/**
 * @fileoverview Individual scan card component with selection support.
 * @module app/domains/invoices/view-scans/_components/ScanCard
 */

import {deleteScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Card,
	CardContent,
	Checkbox,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useState} from "react";
import {TbDotsVertical, TbFileTypePdf, TbLink, TbTrash} from "react-icons/tb";

type ScanCardProps = {
	scan: CachedScan;
	isSelected: boolean;
	onToggleSelect: () => void;
};

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a date as a short date string.
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Individual scan card with selection checkbox.
 */
export default function ScanCard({scan, isSelected, onToggleSelect}: Readonly<ScanCardProps>): React.JSX.Element {
	const t = useTranslations("Domains.services.invoices.service.view-scans.scanCard");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const removeScan = useScansStore((state) => state.removeScan);

	const isUsedByInvoice = scan.metadata?.["usedByInvoice"] === "true";

	const handleDelete = async (): Promise<void> => {
		setIsDeleting(true);
		try {
			const result = await deleteScan({blobUrl: scan.blobUrl});
			if (result.success) {
				removeScan(scan.id);
				toast.success(t("deleteDialog.success"));
			} else {
				toast.error(result.error ?? t("deleteDialog.error"));
			}
		} catch (error) {
			toast.error(t("deleteDialog.error"));
			console.error("Error deleting scan:", error);
		} finally {
			setIsDeleting(false);
			setShowDeleteDialog(false);
		}
	};

	return (
		<>
			<Card
				className={`cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md ${
					isSelected ? "ring-2 ring-purple-500 dark:ring-purple-400" : ""
				}`}
				onClick={onToggleSelect}>
				<CardContent className='p-0'>
					{/* Preview */}
					<div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
						{scan.mimeType === "application/pdf" ? (
							<div className='flex h-full items-center justify-center'>
								<TbFileTypePdf className='h-16 w-16 text-red-500' />
							</div>
						) : (
							<Image
								src={scan.blobUrl}
								alt={scan.name}
								fill
								className='object-cover'
								unoptimized
							/>
						)}

						{/* Selection checkbox */}
						<div
							className='absolute left-2 top-2'
							onClick={(e) => e.stopPropagation()}>
							<Checkbox
								checked={isSelected}
								onCheckedChange={onToggleSelect}
								className='h-5 w-5 border-2 border-white bg-white/80 data-[state=checked]:bg-purple-500'
							/>
						</div>

						{/* Actions menu */}
						<div
							className='absolute right-2 top-2'
							onClick={(e) => e.stopPropagation()}>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type='button'
										className='flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm transition-colors hover:bg-white dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800'>
										<TbDotsVertical className='h-4 w-4' />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									<DropdownMenuItem
										className='text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/20'
										onClick={() => setShowDeleteDialog(true)}>
										<TbTrash className='mr-2 h-4 w-4' />
										{t("delete")}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Used by invoice badge */}
						{isUsedByInvoice && (
							<div className='absolute bottom-2 right-2'>
								<div className='flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-0.5 text-xs font-medium text-white'>
									<TbLink className='h-3 w-3' />
									{t("linked")}
								</div>
							</div>
						)}
					</div>

					{/* File info */}
					<div className='p-3'>
						<p
							className='truncate text-sm font-medium text-gray-900 dark:text-white'
							title={scan.name}>
							{scan.name}
						</p>
						<div className='mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
							<span>{formatFileSize(scan.sizeInBytes)}</span>
							<span>{formatDate(scan.uploadedAt)}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{isUsedByInvoice ? (
								<>
									<span className='mb-2 block font-medium text-amber-600 dark:text-amber-400'>
										{t("deleteDialog.linkedWarning")}
									</span>
									{t("deleteDialog.linkedDescription")}
								</>
							) : (
								<>{t("deleteDialog.description", {name: scan.name})}</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className='bg-red-600 text-white hover:bg-red-700'>
							{isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
