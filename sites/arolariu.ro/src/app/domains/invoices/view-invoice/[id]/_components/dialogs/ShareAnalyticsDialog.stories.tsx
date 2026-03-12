import type {Meta, StoryObj} from "@storybook/react";
import {withDialogProvider} from "../../../../../../../../.storybook/providers";
import ShareAnalyticsDialog from "./ShareAnalyticsDialog";

/**
 * ShareAnalyticsDialog renders a tabbed sharing dialog with image and email options.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/ViewInvoice/Dialogs/ShareAnalyticsDialog",
  component: ShareAnalyticsDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    withDialogProvider,
  ],
} satisfies Meta<typeof ShareAnalyticsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics sharing dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};
