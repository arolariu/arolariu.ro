import type {Meta, StoryObj} from "@storybook/react";
import {WithScanUploadContext} from "../../_storybook";
import UploadArea from "./UploadArea";

/**
 * UploadArea provides a drag-and-drop area for uploading receipt scans.
 * Depends on `useScanUpload` context.
 *
 * This story mounts the real UploadArea component wrapped with WithScanUploadContext.
 */
const meta = {
	title: "Invoices/UploadScans/UploadArea",
	component: UploadArea,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<WithScanUploadContext>
				<Story />
			</WithScanUploadContext>
		),
	],
} satisfies Meta<typeof UploadArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty state — no files selected yet.
 * The component renders the large dropzone with instructions.
 */
export const EmptyState: Story = {};
