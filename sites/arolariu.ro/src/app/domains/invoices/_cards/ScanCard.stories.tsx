/**
 * @fileoverview Storybook stories for ScanCard component.
 * @module app/domains/invoices/_cards/ScanCard.stories
 */

import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {TbLink, TbRotateClockwise, TbTrash} from "react-icons/tb";
import ScanCard from "./ScanCard";
import {storyImageScanUrl, storyPdfScanUrl} from "@/app/domains/invoices/_storybook/fixtures/scanFixtures";
import {logStoryAction} from "@/app/domains/invoices/_storybook/utils/storyActions";

const meta = {
	title: "Invoices/Shared/ScanCard",
	component: ScanCard,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays a receipt scan thumbnail with title, metadata, optional status badge, progress indicator, linked badge, center overlay, actions menu, and rename capability. Supports image and PDF media types with preview activation.",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ScanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Image scan with action menu.
 */
export const ImageWithActions: Story = {
	args: {
		media: {
			src: storyImageScanUrl,
			mediaKind: "image",
			alt: "Grocery receipt scan",
			onPreviewActivate: () => {
				logStoryAction("Preview activated");
			},
		},
		title: "grocery-receipt-2024-03-15.jpg",
		metadataItems: ["240 KB", "Mar 15, 2024"],
		actions: [
			{
				key: "rotate",
				label: "Rotate",
				icon: <TbRotateClockwise />,
				onSelect: () => {
					logStoryAction("Rotate scan");
				},
			},
			{
				key: "delete",
				label: "Delete",
				icon: <TbTrash />,
				onSelect: () => {
					logStoryAction("Delete scan");
				},
				destructive: true,
			},
		],
	},
};

/**
 * PDF scan selected variant.
 */
export const PdfSelected: Story = {
	args: {
		media: {
			src: storyPdfScanUrl,
			mediaKind: "pdf",
			alt: "Invoice PDF scan",
			onPreviewActivate: () => {
				logStoryAction("PDF preview activated");
			},
		},
		title: "invoice-2024-03-15.pdf",
		metadataItems: ["500 KB", "Mar 15, 2024", "2 pages"],
		isSelected: true,
		selection: {
			checked: true,
			onToggle: () => {
				logStoryAction("Toggle selection");
			},
			label: "Select scan",
		},
		actions: [
			{
				key: "delete",
				label: "Delete",
				icon: <TbTrash />,
				onSelect: () => {
					logStoryAction("Delete PDF scan");
				},
				destructive: true,
			},
		],
	},
};

/**
 * Scan card with upload progress.
 */
export const UploadProgress: Story = {
	args: {
		media: {
			src: storyImageScanUrl,
			mediaKind: "image",
			alt: "Uploading receipt scan",
		},
		title: "uploading-receipt.jpg",
		isLocked: true,
		statusBadge: (
			<span
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(59, 130, 246, 0.9)",
					padding: "0.25rem 0.75rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Uploading
			</span>
		),
		progress: {value: 70, label: "70% uploaded"},
	},
};

/**
 * Scan card in rename editing mode with state.
 * Uses a small harness component to demonstrate rename state management.
 */
export const RenameEditing: Story = {
	render: () => {
		// eslint-disable-next-line react-hooks/rules-of-hooks -- Storybook render function is equivalent to a component
		const [isEditing, setIsEditing] = useState(false);
		// eslint-disable-next-line react-hooks/rules-of-hooks -- Storybook render function is equivalent to a component
		const [value, setValue] = useState("old-receipt-name.jpg");

		return (
			<ScanCard
				media={{
					src: storyImageScanUrl,
					mediaKind: "image",
					alt: "Scan being renamed",
				}}
				title={value}
				metadataItems={["1.5 MB", "Mar 14, 2024"]}
				rename={{
					value,
					isEditing,
					onStart: () => {
						setIsEditing(true);
						logStoryAction("Start rename");
					},
					onChange: (newValue: string) => {
						setValue(newValue);
						logStoryAction(`Rename value changed: ${newValue}`);
					},
					onCommit: () => {
						setIsEditing(false);
						logStoryAction(`Rename committed: ${value}`);
					},
					onCancel: () => {
						setIsEditing(false);
						setValue("old-receipt-name.jpg");
						logStoryAction("Rename cancelled");
					},
					placeholder: "Enter new name",
				}}
			/>
		);
	},
};

/**
 * Scan linked to invoice with badge.
 */
export const LinkedToInvoice: Story = {
	args: {
		media: {
			src: storyImageScanUrl,
			mediaKind: "image",
			alt: "Scan linked to invoice",
		},
		title: "invoice-attachment.jpg",
		metadataItems: ["950 KB", "Mar 13, 2024"],
		linkedBadge: (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.25rem",
					borderRadius: "9999px",
					backgroundColor: "rgba(59, 130, 246, 0.9)",
					padding: "0.25rem 0.75rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				<TbLink style={{height: "0.75rem", width: "0.75rem"}} />
				Linked
			</div>
		),
		actions: [
			{
				key: "delete",
				label: "Delete",
				icon: <TbTrash />,
				onSelect: () => {
					logStoryAction("Delete linked scan");
				},
				destructive: true,
			},
		],
	},
};

/**
 * Upload failed with error message.
 */
export const UploadError: Story = {
	args: {
		media: {
			src: storyImageScanUrl,
			mediaKind: "image",
			alt: "Failed upload scan",
		},
		title: "failed-receipt.jpg",
		metadataItems: ["2.1 MB"],
		isLocked: true,
		statusBadge: (
			<span
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(239, 68, 68, 0.9)",
					padding: "0.25rem 0.75rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Failed
			</span>
		),
		error: "Upload failed: Network error",
	},
};

/**
 * Scan with center processing overlay.
 */
export const ProcessingOverlay: Story = {
	args: {
		media: {
			src: storyImageScanUrl,
			mediaKind: "image",
			alt: "Scan being processed",
		},
		title: "processing-receipt.jpg",
		metadataItems: ["1.8 MB", "Mar 12, 2024"],
		isLocked: true,
		centerOverlay: (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0.5rem",
					backgroundColor: "rgba(255, 255, 255, 0.95)",
					padding: "1.5rem",
					borderRadius: "0.5rem",
					boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				}}>
				<div
					style={{
						height: "2rem",
						width: "2rem",
						border: "3px solid #e5e7eb",
						borderTopColor: "#3b82f6",
						borderRadius: "9999px",
						animation: "spin 0.8s linear infinite",
					}}
				/>
				<span style={{fontSize: "0.875rem", fontWeight: 500, color: "#374151"}}>Processing...</span>
			</div>
		),
	},
};
