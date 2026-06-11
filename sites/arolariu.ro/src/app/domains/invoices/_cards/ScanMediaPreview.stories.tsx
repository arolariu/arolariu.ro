/**
 * @fileoverview Storybook stories for ScanMediaPreview component.
 * @module app/domains/invoices/_cards/ScanMediaPreview.stories
 */

import type {Meta, StoryObj} from "@storybook/react";
import {ScanMediaPreview} from "./ScanMediaPreview";
import {storyImageScanUrl, storyPdfScanUrl} from "@/app/domains/invoices/_storybook/fixtures/scanFixtures";
import {logStoryAction} from "@/app/domains/invoices/_storybook/utils/storyActions";

const meta = {
	title: "Invoices/Shared/ScanMediaPreview",
	component: ScanMediaPreview,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Media preview component for scan cards. Displays image thumbnails or PDF placeholders with fallback support. Handles click activation for preview dialogs and locked states during upload or processing.",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ScanMediaPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Image scan preview variant.
 */
export const Image: Story = {
	args: {
		src: storyImageScanUrl,
		mediaKind: "image",
		alt: "Grocery receipt scan from storybook fixture",
		loading: "eager",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Standard image preview displaying grocery receipt thumbnail. Uses Next.js Image component with eager loading for immediate render in Storybook. Demonstrates default image media type rendering.",
			},
		},
	},
};

/**
 * PDF scan preview variant.
 */
export const Pdf: Story = {
	args: {
		src: storyPdfScanUrl,
		mediaKind: "pdf",
		alt: "Invoice PDF scan from storybook fixture",
		loading: "eager",
	},
	parameters: {
		docs: {
			description: {
				story:
					"PDF preview showing file icon placeholder instead of thumbnail. Renders TbFileTypePdf icon with neutral background since PDFs cannot be previewed as thumbnails. Demonstrates PDF media type handling.",
			},
		},
	},
};

/**
 * Missing preview variant (no src).
 */
export const MissingPreview: Story = {
	args: {
		src: "",
		mediaKind: "unknown",
		alt: "Missing scan preview",
		loading: "eager",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Fallback state when no preview source is available. Displays TbFileUnknown icon with muted background. Demonstrates graceful degradation when media cannot be loaded or is unavailable.",
			},
		},
	},
};

/**
 * Interactive image with preview activation callback.
 */
export const WithPreviewActivation: Story = {
	args: {
		src: storyImageScanUrl,
		mediaKind: "image",
		alt: "Click to preview full scan",
		loading: "eager",
		onPreviewActivate: () => {
			logStoryAction("Preview activated");
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"Interactive preview that triggers callback on click. Cursor changes to pointer on hover; click logs 'Preview activated' action. Use for opening full-screen preview dialogs or lightboxes.",
			},
		},
	},
};

/**
 * Scan with custom overlays in all corners.
 */
export const WithOverlays: Story = {
	args: {
		src: storyImageScanUrl,
		mediaKind: "image",
		alt: "Scan with overlay badges",
		loading: "eager",
		topLeftOverlay: (
			<div
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(59, 130, 246, 0.9)",
					padding: "0.25rem 0.5rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Top Left
			</div>
		),
		topRightOverlay: (
			<div
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(34, 197, 94, 0.9)",
					padding: "0.25rem 0.5rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Top Right
			</div>
		),
		bottomLeftOverlay: (
			<div
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(168, 85, 247, 0.9)",
					padding: "0.25rem 0.5rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Bottom Left
			</div>
		),
		bottomRightOverlay: (
			<div
				style={{
					borderRadius: "9999px",
					backgroundColor: "rgba(239, 68, 68, 0.9)",
					padding: "0.25rem 0.5rem",
					fontSize: "0.75rem",
					fontWeight: 500,
					color: "white",
				}}>
				Bottom Right
			</div>
		),
	},
	parameters: {
		docs: {
			description: {
				story:
					"Preview with all four corner overlay slots populated. Demonstrates positioning for status badges, linked indicators, selection checkboxes, or action buttons. Each overlay uses distinct color for clarity.",
			},
		},
	},
};

/**
 * Scan with center overlay (e.g., processing spinner).
 */
export const WithCenterOverlay: Story = {
	args: {
		src: storyImageScanUrl,
		mediaKind: "image",
		alt: "Scan with center processing overlay",
		loading: "eager",
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
	parameters: {
		docs: {
			description: {
				story:
					"Preview with centered overlay card (processing state). Overlay covers entire preview area with semi-transparent background. Use for upload progress, OCR processing, or other blocking operations.",
			},
		},
	},
};
