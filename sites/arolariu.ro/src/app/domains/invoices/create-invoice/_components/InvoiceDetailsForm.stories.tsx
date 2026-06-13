import React from "react";
import type {Meta, StoryObj} from "@storybook/react";
import type {CachedScan} from "@/types/scans";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, WithCreateInvoiceContext} from "../../_storybook";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import InvoiceDetailsForm from "./InvoiceDetailsForm";

/**
 * Wrapper that selects scans in CreateInvoiceContext on mount.
 */
function InvoiceDetailsFormWithSelection({scansToSelect}: Readonly<{scansToSelect: CachedScan[]}>): React.JSX.Element {
	const {toggleScan, selectedScans} = useCreateInvoiceContext();

	React.useEffect(() => {
		// Only select if not already selected
		for (const scan of scansToSelect) {
			if (!selectedScans.some((s) => s.id === scan.id)) {
				toggleScan(scan);
			}
		}
	}, [scansToSelect, toggleScan, selectedScans]);

	return <InvoiceDetailsForm />;
}

const meta = {
	title: "arolariu.ro/IMS/CreateInvoice/InvoiceDetailsForm",
	component: InvoiceDetailsForm,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Invoice details form for step 2 of the create wizard. Displays fields for invoice name (required), category dropdown, payment type dropdown, transaction date picker (calendar popover), and optional description textarea. Shows scan thumbnail preview on desktop/right side. Context-aware component that reads/writes invoice details from CreateInvoiceContext.",
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
} satisfies Meta<typeof InvoiceDetailsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSelectedScan: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan],
			selectedScans: [],
		});
	},
	render: () => <InvoiceDetailsFormWithSelection scansToSelect={[storyCachedImageScan]} />,
	parameters: {
		docs: {
			description: {
				story: "Shows the form with a selected scan thumbnail preview. All form fields are interactive and persist to context state.",
			},
		},
	},
};

export const WithoutScan: Story = {
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
				story: "Shows the form without scan preview (no scan selected). Form fields remain fully functional.",
			},
		},
	},
};
