import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {ScanUploadProvider, useScanUpload} from "../_context/ScanUploadContext";
import UploadArea from "./UploadArea";

/**
 * Adds real `File` objects to the real `useScanUpload` context on mount,
 * exercising the exact `addFiles` code path that a user's file
 * picker/drag-drop/paste interaction triggers in production. Upload itself
 * (`uploadAll` → `createScan`/`createScanUploadTarget` server actions) is
 * only triggered by clicking "Upload Scans" — it is not invoked during the
 * default render.
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
 * UploadArea provides a drag-and-drop area for uploading receipt scans,
 * backed by the real `ScanUploadProvider` context (route-scoped upload
 * queue reducer).
 */
const meta = {
  title: "Invoices/UploadScans/UploadArea",
  component: UploadArea,
  decorators: [
    (Story) => (
      <ScanUploadProvider>
        <Story />
      </ScanUploadProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof UploadArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state — no files selected yet. */
export const EmptyState: Story = {};

/** Compact state — files already added via the real `addFiles` action. */
export const WithFiles: Story = {
  decorators: [
    (Story) => (
      <SeedFilesHarness count={2}>
        <Story />
      </SeedFilesHarness>
    ),
  ],
};
