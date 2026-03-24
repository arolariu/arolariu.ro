import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {VisuallyHidden} from "./visually-hidden";

const meta = {
  title: "Components/Utilities/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Icon button with visually hidden label for screen readers.
 */
export const IconButton: Story = {
  render: () => (
    <button
      type='button'
      style={{
        padding: "0.75rem",
        background: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1.25rem",
        cursor: "pointer",
      }}>
      🗑️
      <VisuallyHidden>Delete item</VisuallyHidden>
    </button>
  ),
};

/**
 * Multiple icon buttons with accessible labels.
 */
export const IconGroup: Story = {
  render: () => (
    <div style={{display: "flex", gap: "0.5rem"}}>
      <button
        type='button'
        style={{
          padding: "0.75rem",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.25rem",
          cursor: "pointer",
        }}>
        📝
        <VisuallyHidden>Edit</VisuallyHidden>
      </button>
      <button
        type='button'
        style={{
          padding: "0.75rem",
          background: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.25rem",
          cursor: "pointer",
        }}>
        👁️
        <VisuallyHidden>View</VisuallyHidden>
      </button>
      <button
        type='button'
        style={{
          padding: "0.75rem",
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.25rem",
          cursor: "pointer",
        }}>
        🗑️
        <VisuallyHidden>Delete</VisuallyHidden>
      </button>
    </div>
  ),
};

/**
 * Form with visually hidden status message for screen readers.
 */
export const FormStatus: Story = {
  render: () => (
    <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px", maxWidth: "400px"}}>
      <h3 style={{marginBottom: "1rem"}}>Subscribe to Newsletter</h3>
      <input
        type='email'
        placeholder='Enter your email'
        style={{width: "100%", padding: "0.75rem", marginBottom: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
      />
      <button
        type='submit'
        style={{
          width: "100%",
          padding: "0.75rem",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}>
        Subscribe
      </button>
      <VisuallyHidden role='status'>Form submission successful</VisuallyHidden>
    </div>
  ),
};
