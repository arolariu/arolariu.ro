"use client";

/**
 * @fileoverview Preview component for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview
 *
 * @remarks
 * Displays a grid of pending uploads with status indicators.
 */

import {Badge, Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import Image from "next/image";
import {TbFileTypePdf, TbLoader2, TbCheck, TbX, TbTrash} from "react-icons/tb";
import {useScanUpload} from "../_context/ScanUploadContext";

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Preview component for pending scan uploads.
 * Displays a grid of files with status indicators.
 */
export default function UploadPreview(): React.JSX.Element | null {
	const {pendingUploads, removeFiles} = useScanUpload();

	if (pendingUploads.length === 0) {
		return null;
	}

	return (
		<div className='mb-8'>
			<div className='mb-4 flex items-center justify-between'>
				<h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
					Pending Uploads ({pendingUploads.length})
				</h2>
			</div>

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
				{pendingUploads.map((upload) => (
					<Card
						key={upload.id}
						className='relative overflow-hidden'>
						<CardContent className='p-0'>
							{/* Preview */}
							<div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
								{upload.mimeType === "application/pdf" ? (
									<div className='flex h-full items-center justify-center'>
										<TbFileTypePdf className='h-16 w-16 text-red-500' />
									</div>
								) : (
									<Image
										src={upload.preview}
										alt={upload.name}
										fill
										className='object-cover'
										unoptimized
									/>
								)}

								{/* Status overlay */}
								{upload.status === "uploading" && (
									<div className='absolute inset-0 flex items-center justify-center bg-black/50'>
										<TbLoader2 className='h-10 w-10 animate-spin text-white' />
									</div>
								)}
								{upload.status === "completed" && (
									<div className='absolute inset-0 flex items-center justify-center bg-green-500/50'>
										<TbCheck className='h-10 w-10 text-white' />
									</div>
								)}
								{upload.status === "failed" && (
									<div className='absolute inset-0 flex items-center justify-center bg-red-500/50'>
										<TbX className='h-10 w-10 text-white' />
									</div>
								)}

								{/* Status badge */}
								<div className='absolute right-2 top-2'>
									{upload.status === "idle" && (
										<Badge
											variant='secondary'
											className='bg-gray-500/80 text-white'>
											Pending
										</Badge>
									)}
									{upload.status === "uploading" && (
										<Badge
											variant='secondary'
											className='bg-blue-500/80 text-white'>
											Uploading
										</Badge>
									)}
									{upload.status === "completed" && (
										<Badge
											variant='secondary'
											className='bg-green-500/80 text-white'>
											Done
										</Badge>
									)}
									{upload.status === "failed" && (
										<Badge
											variant='secondary'
											className='bg-red-500/80 text-white'>
											Failed
										</Badge>
									)}
								</div>

								{/* Remove button */}
								{(upload.status === "idle" || upload.status === "failed") && (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant='ghost'
													size='icon'
													className='absolute left-2 top-2 h-8 w-8 bg-black/50 text-white hover:bg-black/70'
													onClick={() => removeFiles([upload.id])}>
													<TbTrash className='h-4 w-4' />
												</Button>
											</TooltipTrigger>
											<TooltipContent side='right'>Remove from queue</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</div>

							{/* File info */}
							<div className='p-3'>
								<p
									className='truncate text-sm font-medium text-gray-900 dark:text-white'
									title={upload.name}>
									{upload.name}
								</p>
								<p className='text-xs text-gray-500 dark:text-gray-400'>{formatFileSize(upload.size)}</p>
								{upload.error && <p className='mt-1 truncate text-xs text-red-500'>{upload.error}</p>}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
