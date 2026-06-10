import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyMerchant} from "../../../_storybook";
import MerchantDialog from "./MerchantDialog";

/**
 * MerchantDialog renders merchant details view.
 *
 * @remarks
 * This story mounts the real MerchantDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story merchant payload.
 */
const meta = {
	title: "Invoices/Dialogs/MerchantDialog",
	component: MerchantDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof MerchantDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default merchant details dialog.
 */
export const Default: Story = {
	render: () => (
		<OpenDialogOnMount dialog="EDIT_INVOICE__MERCHANT" mode="view" payload={storyMerchant}>
			<MerchantDialog />
		</OpenDialogOnMount>
	),
};
