import React from "react";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, storyCachedPdfScan, WithCreateInvoiceContext} from "../../_storybook";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import ReviewStep from "./ReviewStep";

/**
 * Wrapper that seeds invoice details via context.
 */
function ReviewStepWithDetails({
	name = "Grocery Shopping",
	category = InvoiceCategory.GROCERY,
	paymentType = PaymentType.Card,
	description = "Weekly grocery shopping at local supermarket",
}: Readonly<{
	name?: string;
	category?: InvoiceCategory;
	paymentType?: PaymentType;
	description?: string;
}>): React.JSX.Element {
	const {setName, setCategory, setPaymentType, setDescription, setTransactionDate} = useCreateInvoiceContext();

	React.useEffect(() => {
		setName(name);
		setCategory(category);
		setPaymentType(paymentType);
		setDescription(description);
		setTransactionDate(new Date("2024-03-15T10:30:00.000Z"));
	}, [name, category, paymentType, description, setName, setCategory, setPaymentType, setDescription, setTransactionDate]);

	return <ReviewStep />;
}

const meta = {
	title: "Invoices/CreateInvoice/ReviewStep",
	component: ReviewStep,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Review step component for final confirmation before invoice creation (step 3). Displays summary of selected scans (thumbnails with hover animation) and invoice details (name, category, payment type, transaction date, description). Features a primary Create Invoice button with loading state and spinner during creation. Context-aware component that reads state from CreateInvoiceContext.",
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
} satisfies Meta<typeof ReviewStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleScan: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan],
			selectedScans: [storyCachedImageScan],
		});
	},
	render: () => <ReviewStepWithDetails />,
	parameters: {
		docs: {
			description: {
				story: "Shows the review step with a single selected scan and complete invoice details. Ready for creation.",
			},
		},
	},
};

export const MultipleScans: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		const scans = [
			storyCachedImageScan,
			storyCachedPdfScan,
			{
				...storyCachedImageScan,
				id: "scan-review-3",
				name: "Receipt 3",
				metadata: {...storyCachedImageScan.metadata, scanId: "scan-review-3"},
			},
		];
		seedInvoiceStoryStores({
			scans,
			selectedScans: scans,
		});
	},
	render: () => <ReviewStepWithDetails />,
	parameters: {
		docs: {
			description: {
				story: "Shows the review step with 3 selected scans. Displays scan thumbnails in a grid with badge showing count.",
			},
		},
	},
};

export const FastFoodCategory: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan],
			selectedScans: [storyCachedImageScan],
		});
	},
	render: () => (
		<ReviewStepWithDetails
			name='McDonalds Lunch'
			category={InvoiceCategory.FAST_FOOD}
			paymentType={PaymentType.Cash}
			description='Quick lunch during work break'
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Shows the review step with Fast Food category and Cash payment. Demonstrates different category/payment type badges.",
			},
		},
	},
};

export const NoDescription: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedImageScan],
			selectedScans: [storyCachedImageScan],
		});
	},
	render: () => <ReviewStepWithDetails description='' />,
	parameters: {
		docs: {
			description: {
				story: "Shows the review step without optional description field (description field is hidden when empty).",
			},
		},
	},
};

export const UnknownPayment: Story = {
	beforeEach: () => {
		resetInvoiceStoryStores();
		seedInvoiceStoryStores({
			scans: [storyCachedPdfScan],
			selectedScans: [storyCachedPdfScan],
		});
	},
	render: () => (
		<ReviewStepWithDetails
			name='Car Maintenance'
			category={InvoiceCategory.CAR_AUTO}
			paymentType={PaymentType.Unknown}
			description=''
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Shows the review step with Car/Auto category and Unknown payment type. Demonstrates edge case payment type.",
			},
		},
	},
};
