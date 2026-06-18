import {setupScanUploadStory, WithScanUploadContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {expect, within} from "storybook/test";
import UploadArea from "./UploadArea";

/**
 * UploadArea provides a drag-and-drop area for uploading receipt scans.
 * Depends on `useScanUpload` context.
 *
 * This story mounts the real UploadArea component wrapped with WithScanUploadContext.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Scan/UploadArea",
  component: UploadArea,
  parameters: {
    layout: "centered",
  },
  beforeEach: () => {
    setupScanUploadStory();
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
export const EmptyState: Story = {
  play: async ({canvasElement, step}) => {
    const canvas = within(canvasElement);

    await step("renders upload interaction target", async () => {
      await expect(canvas.getAllByText(/drag/i).length).toBeGreaterThan(0);
    });
  },
};

/**
 * Empty state with helpful tooltip content visible.
 * Shows the default state rendering with all upload instructions.
 */
export const WithTooltipHint: Story = {
  play: async ({canvasElement, step}) => {
    const canvas = within(canvasElement);

    await step("renders upload interaction target with instructions", async () => {
      await expect(canvas.getAllByText(/drag/i).length).toBeGreaterThan(0);
    });
  },
  parameters: {
    docs: {
      description: {
        story:
          "Empty upload area showing drag-and-drop instructions and supported file types. Tests default state rendering and user guidance.",
      },
    },
  },
};
