import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {ScanUploadProvider, useScanUpload} from "../_context/ScanUploadContext";
import UploadPreview from "./UploadPreview";

/**
 * Adds real `File` objects to the real `useScanUpload` context on mount,
 * exercising the exact `addFiles` code path a user's file picker/drag-drop
 * interaction would trigger. `UploadPreview` renders `null` while
 * `pendingUploads` is empty, so a story must seed at least one file.
 */
function SeedFilesHarness({count, children}: Readonly<{count: number; children: React.ReactNode}>): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const files = Array.from(
      {length: count},
      (_unused, i) => new File(["storybook-fixture"], `receipt-${i + 1}.jpg`, {type: "image/jpeg"}),
    );
    void addFiles(files, "input");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per story mount
  }, []);

  return <>{children}</>;
}

/**
 * UploadPreview displays a grid of pending file uploads with status
 * indicators, progress bars, and remove buttons, backed by the real
 * `ScanUploadProvider` context.
 */
const meta = {
  title: "Invoices/UploadScans/UploadPreview",
  component: UploadPreview,
  decorators: [
    (Story) => (
      <ScanUploadProvider>
        <SeedFilesHarness count={4}>
          <Story />
        </SeedFilesHarness>
      </ScanUploadProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof UploadPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pending uploads freshly added to the real upload queue (all start in the "idle" state). */
export const Default: Story = {};

/** Single pending upload. */
export const SingleFile: Story = {
  decorators: [
    (Story) => (
      <ScanUploadProvider>
        <SeedFilesHarness count={1}>
          <Story />
        </SeedFilesHarness>
      </ScanUploadProvider>
    ),
  ],
};
