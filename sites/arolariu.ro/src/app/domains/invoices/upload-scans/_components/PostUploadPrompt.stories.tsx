import type {Meta, StoryObj} from "@storybook/react";
import {storyImageScanUrl} from "../../_storybook";
import PostUploadPrompt from "./PostUploadPrompt";

const meta = {
	title: "arolariu.ro/IMS/Components/Scan/PostUploadPrompt",
	component: PostUploadPrompt,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Animated overlay prompt that appears after successful scan uploads. Offers users immediate actions: create an invoice from uploaded scans, view scans in the library, or dismiss the prompt. Features success checkmark animation, scan thumbnails, and backdrop blur.",
			},
		},
	},
	args: {
		onCreateInvoice: () => console.log("Create invoice clicked"),
		onViewScans: () => console.log("View scans clicked"),
		onDismiss: () => console.log("Dismiss clicked"),
	},
} satisfies Meta<typeof PostUploadPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleScan: Story = {
	args: {
		isVisible: true,
		completedScans: [
			{
				id: "scan-1",
				preview: storyImageScanUrl,
				name: "grocery-receipt.jpg",
			},
		],
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the post-upload prompt after successfully uploading a single scan. Displays one thumbnail.",
			},
		},
	},
};

export const MultipleScans: Story = {
	args: {
		isVisible: true,
		completedScans: [
			{
				id: "scan-1",
				preview: storyImageScanUrl,
				name: "receipt-1.jpg",
			},
			{
				id: "scan-2",
				preview: storyImageScanUrl,
				name: "receipt-2.pdf",
			},
			{
				id: "scan-3",
				preview: storyImageScanUrl,
				name: "receipt-3.jpg",
			},
		],
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the prompt with 3 uploaded scans. Displays thumbnails in a row with staggered animations.",
			},
		},
	},
};

export const ManyScans: Story = {
	args: {
		isVisible: true,
		completedScans: [
			{id: "scan-1", preview: storyImageScanUrl, name: "receipt-1.jpg"},
			{id: "scan-2", preview: storyImageScanUrl, name: "receipt-2.pdf"},
			{id: "scan-3", preview: storyImageScanUrl, name: "receipt-3.jpg"},
			{id: "scan-4", preview: storyImageScanUrl, name: "receipt-4.jpg"},
			{id: "scan-5", preview: storyImageScanUrl, name: "receipt-5.jpg"},
			{id: "scan-6", preview: storyImageScanUrl, name: "receipt-6.jpg"},
			{id: "scan-7", preview: storyImageScanUrl, name: "receipt-7.jpg"},
		],
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the prompt with 7 scans. Only first 5 thumbnails are shown, with a +2 counter for remaining scans.",
			},
		},
	},
};

export const Hidden: Story = {
	args: {
		isVisible: false,
		completedScans: [
			{
				id: "scan-1",
				preview: storyImageScanUrl,
				name: "receipt.jpg",
			},
		],
	},
	parameters: {
		docs: {
			description: {
				story: "Shows the prompt in hidden state (no overlay or card rendered). Controlled by isVisible prop.",
			},
		},
	},
};
