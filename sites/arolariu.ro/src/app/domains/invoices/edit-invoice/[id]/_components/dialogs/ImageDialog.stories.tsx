import type {Meta, StoryObj} from "@storybook/react";

/**
 * Static visual preview of the ImageDialog component.
 *
 * The actual component depends on `useDialog` context with a payload URL,
 * so this story renders a faithful HTML replica of the full-width dialog
 * with a receipt image placeholder.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ImageDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default image dialog with receipt placeholder. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Receipt Image</h2>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          aspectRatio: "3/4",
          maxHeight: "500px",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}>
        <img
          src='https://picsum.photos/seed/imagedialog/600/800'
          alt='Receipt scan preview'
          style={{height: "100%", width: "100%", objectFit: "contain"}}
        />
      </div>
    </div>
  ),
};
