import type {Meta, StoryObj} from "@storybook/react";

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access.
 *
 * **DISABLED**: This story is temporarily disabled due to a Vite bundling issue.
 * The real SharingCard component imports `patchInvoice` server action, which
 * transitively imports `@azure/storage-blob` (via instrumentation → storageClient).
 * Even with Vite aliases configured to mock the action, the browser build
 * still attempts to bundle the Azure module, which fails because BlobSASPermissions
 * and generateBlobSASQueryParameters are Node.js-only exports.
 *
 * **Resolution**: Requires investigation into Vite's module resolution for server-only
 * code or refactoring SharingCard to decouple server action imports from the component.
 *
 * @see https://github.com/arolariu/arolariu.ro/issues/TBD
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/SharingCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Placeholder story (real component disabled due to bundling issue). */
export const Disabled: Story = {
  render: () => (
    <div style={{padding: "2rem", textAlign: "center", color: "#6b7280"}}>
      <p style={{marginBottom: "0.5rem", fontWeight: 600}}>SharingCard Story Disabled</p>
      <p style={{fontSize: "0.875rem"}}>
        This story is disabled due to a Vite bundling issue with server-only Azure dependencies.
        <br />
        See story file comments for details.
      </p>
    </div>
  ),
};
