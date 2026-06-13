import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, storyCachedPdfScan} from "../../_storybook";
import ScanGroupBanner from "./ScanGroupBanner";

/**
 * Create scan fixtures uploaded within 5 minutes of each other.
 */
const scanGroup = [
	{
		...storyCachedImageScan,
		id: "scan-group-1",
		name: "Receipt 1",
		uploadedAt: new Date("2024-03-15T10:00:00.000Z"),
		metadata: {
			...storyCachedImageScan.metadata,
			scanId: "scan-group-1",
			uploadedAt: new Date("2024-03-15T10:00:00.000Z"),
		},
	},
	{
		...storyCachedPdfScan,
		id: "scan-group-2",
		name: "Receipt 2",
		uploadedAt: new Date("2024-03-15T10:02:00.000Z"),
		metadata: {
			...storyCachedPdfScan.metadata,
			scanId: "scan-group-2",
			uploadedAt: new Date("2024-03-15T10:02:00.000Z"),
		},
	},
	{
		...storyCachedImageScan,
		id: "scan-group-3",
		name: "Receipt 3",
		uploadedAt: new Date("2024-03-15T10:04:00.000Z"),
		metadata: {
			...storyCachedImageScan.metadata,
			scanId: "scan-group-3",
			uploadedAt: new Date("2024-03-15T10:04:00.000Z"),
		},
	},
] as const;

const meta = {
	title: "arolariu.ro/IMS/ViewScans/Components/ScanGroupBanner",
	component: ScanGroupBanner,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Banner that suggests combining scans uploaded within 5 minutes of each other. Displays thumbnails of grouped scans and provides quick navigation to invoice creation. Dismissible with session storage persistence.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div style={{padding: "2rem", backgroundColor: "var(--color-background)"}}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ScanGroupBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithGroupedScans: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: scanGroup,
			selectedScans: [],
		});
		// Clear session storage to ensure banner is visible
		sessionStorage.removeItem("scan-group-banner-dismissed");
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the banner when 3 scans were uploaded within 5 minutes of each other. Displays thumbnails and combine button.",
			},
		},
	},
};

export const WithTwoScans: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [scanGroup[0], scanGroup[1]],
			selectedScans: [],
		});
		sessionStorage.removeItem("scan-group-banner-dismissed");
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the banner with minimum viable group (2 scans uploaded within 5 minutes).",
			},
		},
	},
};

export const NoGroupDetected: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan],
			selectedScans: [],
		});
	},
	parameters: {
		docs: {
			description: {
				story: "Shows no banner when only one scan exists (need at least 2 scans for a group).",
			},
		},
	},
};

export const ScansSpreadApart: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		const spreadScans = [
			{
				...storyCachedImageScan,
				id: "scan-spread-1",
				uploadedAt: new Date("2024-03-15T10:00:00.000Z"),
				metadata: {
					...storyCachedImageScan.metadata,
					scanId: "scan-spread-1",
					uploadedAt: new Date("2024-03-15T10:00:00.000Z"),
				},
			},
			{
				...storyCachedPdfScan,
				id: "scan-spread-2",
				uploadedAt: new Date("2024-03-15T10:30:00.000Z"),
				metadata: {
					...storyCachedPdfScan.metadata,
					scanId: "scan-spread-2",
					uploadedAt: new Date("2024-03-15T10:30:00.000Z"),
				},
			},
		] as const;
		seedInvoiceStoryStores({
			scans: spreadScans,
			selectedScans: [],
		});
	},
	parameters: {
		docs: {
			description: {
				story: "Shows no banner when scans are uploaded more than 5 minutes apart (no grouping detected).",
			},
		},
	},
};

export const Dismissed: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: scanGroup,
			selectedScans: [],
		});
		// Simulate user having dismissed the banner
		sessionStorage.setItem("scan-group-banner-dismissed", "true");
	},
	parameters: {
		docs: {
			description: {
				story: "Shows no banner when user has previously dismissed it (persisted in session storage).",
			},
		},
	},
};
