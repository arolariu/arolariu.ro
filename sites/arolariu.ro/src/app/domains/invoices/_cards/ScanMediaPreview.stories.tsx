/**
 * @fileoverview Storybook stories for ScanMediaPreview component.
 * @module app/domains/invoices/_cards/ScanMediaPreview.stories
 */

import {Badge, Card, Spinner} from "@arolariu/components";
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
					"Media preview component for scan cards. Displays image thumbnails or PDF placeholders with fallback support. Handles click activation for preview dialogs. Uses plain HTML img element for images (not Next.js Image component) to support object/blob/CDN URLs.",
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
					"Standard image preview displaying grocery receipt thumbnail. Uses plain HTML img element with eager loading for immediate render in Storybook. Demonstrates default image media type rendering.",
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
					"Fallback state when no preview source is available. Displays the TbPhotoOff icon with muted background. Demonstrates graceful degradation when media cannot be loaded or is unavailable.",
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
		topLeftOverlay: <Badge variant='default'>Top Left</Badge>,
		topRightOverlay: <Badge variant='secondary'>Top Right</Badge>,
		bottomLeftOverlay: <Badge variant='outline'>Bottom Left</Badge>,
		bottomRightOverlay: <Badge variant='destructive'>Bottom Right</Badge>,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Preview with all four corner overlay slots populated using Badge primitives from @arolariu/components. Demonstrates positioning for status badges, linked indicators, selection checkboxes, or action buttons. Each overlay uses distinct Badge variant for clarity.",
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
			<Card className='flex flex-col items-center gap-2 bg-background/95 p-6 shadow-md'>
				<Spinner />
				<span className='text-sm font-medium text-foreground'>Processing...</span>
			</Card>
		),
	},
	parameters: {
		docs: {
			description: {
				story:
					"Preview with centered overlay card (processing state) using Card primitive from @arolariu/components. Overlay covers entire preview area with semi-transparent background. Use for upload progress, OCR processing, or other blocking operations.",
			},
		},
	},
};
