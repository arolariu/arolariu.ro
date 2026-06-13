import React from "react";
import type {Meta, StoryObj} from "@storybook/react";
import type {CachedScan} from "@/types/scans";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, storyCachedPdfScan, WithCreateInvoiceContext} from "../../_storybook";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import ScanSelector from "./ScanSelector";

/**
 * Additional scan fixtures to create a larger grid.
 */
const additionalScans: CachedScan[] = Array.from({length: 8}, (_, i) => ({
	...storyCachedImageScan,
	id: `scan-selector-${i + 1}`,
	name: `Receipt ${i + 1}`,
	uploadedAt: new Date(`2024-03-${String(15 + i).padStart(2, "0")}T10:00:00.000Z`),
	metadata: {
		...storyCachedImageScan.metadata,
		scanId: `scan-selector-${i + 1}`,
	},
}));

/**
 * Wrapper that selects scans in CreateInvoiceContext on mount.
 */
function ScanSelectorWithSelection({scansToSelect}: Readonly<{scansToSelect: CachedScan[]}>): React.JSX.Element {
	const {toggleScan} = useCreateInvoiceContext();
	const hasInitialized = React.useRef(false);

	React.useEffect(() => {
		if (hasInitialized.current) return;
		hasInitialized.current = true;

		for (const scan of scansToSelect) {
			toggleScan(scan);
		}
	}, [scansToSelect, toggleScan]);

	return <ScanSelector />;
}

const meta = {
	title: "arolariu.ro/IMS/CreateInvoice/ScanSelector",
	component: ScanSelector,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Scan selector component for step 1 of the create wizard. Displays a grid of available READY scans with checkbox overlays, scan metadata (name, upload date, size), and batch selection actions (Select All / Clear Selection). Supports pagination for mobile and desktop. Context-aware component that reads scans from useScansStore and writes selection to CreateInvoiceContext.",
			},
		},
	},
	decorators: [
		(Story) => (
			<WithCreateInvoiceContext>
				<div style={{padding: "2rem", backgroundColor: "var(--color-background)"}}>
					<Story />
				</div>
			</WithCreateInvoiceContext>
		),
	],
} satisfies Meta<typeof ScanSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithScans: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)],
			selectedScans: [],
		});
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the scan selector with 5 available scans. Users can toggle individual scans or use Select All / Clear Selection.",
			},
		},
	},
};

export const WithSelection: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)],
			selectedScans: [],
		});
	},
	render: () => <ScanSelectorWithSelection scansToSelect={[storyCachedImageScan, storyCachedPdfScan]} />,
	parameters: {
		docs: {
			description: {
				story: "Shows the selector with pre-selected scans. Selected count badge is visible and Clear Selection button appears.",
			},
		},
	},
};

export const AllSelected: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		const allScans = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)];
		seedInvoiceStoryStores({
			scans: allScans,
			selectedScans: [],
		});
	},
	render: () => {
		const allScans = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)];
		return <ScanSelectorWithSelection scansToSelect={allScans} />;
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the selector with all scans selected. Select All button is replaced with Clear Selection.",
			},
		},
	},
};

export const Empty: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [],
			selectedScans: [],
		});
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the empty state when no READY scans are available. Displays photo icon and empty message.",
			},
		},
	},
};
