import type {Meta, StoryObj} from "@storybook/react";
import type {Merchant} from "@/types/invoices";
import {
  merchantPresets,
  OpenDialogButton,
  playOpenDialog,
  storyMerchant,
  storyOnlineMerchant,
  withEntityPreset,
} from "../../../_storybook";
import MerchantDialog from "./MerchantDialog";

type StoryArgs = {merchant: Merchant; merchantPreset: "physical" | "online"};

/**
 * MerchantDialog renders merchant details view.
 *
 * @remarks
 * This story mounts the real MerchantDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story merchant payload.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Merchant/MerchantDetails",
	component: MerchantDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		merchantPreset: {control: "select", options: ["physical", "online"]},
		merchant: {control: "object"},
	},
	args: {merchantPreset: "physical", merchant: storyMerchant},
	decorators: [withEntityPreset("merchantPreset", "merchant", merchantPresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default merchant details dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: ({merchant}) => (
		<OpenDialogButton dialog="EDIT_INVOICE__MERCHANT" mode="view" payload={merchant}>
			<MerchantDialog />
		</OpenDialogButton>
	),
};

/**
 * Merchant details dialog for an online-only merchant.
 */
export const OnlineMerchant: Story = {
  args: {merchantPreset: "online", merchant: storyOnlineMerchant},
  play: playOpenDialog,
	render: ({merchant}) => (
		<OpenDialogButton dialog="EDIT_INVOICE__MERCHANT" mode="view" payload={merchant}>
			<MerchantDialog />
		</OpenDialogButton>
	),
};
