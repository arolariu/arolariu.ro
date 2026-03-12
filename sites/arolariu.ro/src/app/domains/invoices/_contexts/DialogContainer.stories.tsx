import type {Meta, StoryObj} from "@storybook/react";
import DialogContainer from "./DialogContainer";
import {DialogProvider} from "./DialogContext";

/**
 * DialogContainer renders the active dialog based on the current dialog type
 * from `useDialogs` context. Wraps in DialogProvider for context access.
 * Returns null when no dialog is active.
 */
const meta = {
  title: "Invoices/DialogContainer",
  component: DialogContainer,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div className='max-w-2xl p-4'>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof DialogContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state — no dialog active, renders null. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
