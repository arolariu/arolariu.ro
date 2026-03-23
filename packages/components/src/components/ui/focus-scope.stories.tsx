import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FocusScope} from "./focus-scope";

const meta = {
  title: "Components/Utilities/FocusScope",
  component: FocusScope,
  tags: ["autodocs"],
  argTypes: {
    contain: {
      control: "boolean",
      description: "Whether focus should be trapped within the scope",
    },
    autoFocus: {
      control: "boolean",
      description: "Whether to auto-focus the first focusable element on mount",
    },
    restoreFocus: {
      control: "boolean",
      description: "Whether to restore focus to the previously focused element on unmount",
    },
  },
} satisfies Meta<typeof FocusScope>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Focus scope with contained focus and auto-focus enabled.
 */
export const Default: Story = {
  args: {
    contain: true,
    autoFocus: true,
    restoreFocus: true,
    children: (
      <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px", border: "2px solid #3b82f6"}}>
        <h3 style={{marginBottom: "1rem"}}>Focus is trapped here</h3>
        <input
          placeholder='First input'
          style={{width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
        />
        <input
          placeholder='Second input'
          style={{width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
        />
        <button
          type='button'
          style={{padding: "0.5rem 1rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px"}}>
          Submit
        </button>
      </div>
    ),
  },
};

/**
 * Focus scope without containment.
 */
export const NoContain: Story = {
  args: {
    contain: false,
    autoFocus: true,
    children: (
      <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px"}}>
        <h3 style={{marginBottom: "1rem"}}>Focus can escape</h3>
        <input
          placeholder='Input field'
          style={{width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
        />
        <button
          type='button'
          style={{padding: "0.5rem 1rem", background: "#6b7280", color: "white", border: "none", borderRadius: "4px"}}>
          Button
        </button>
      </div>
    ),
  },
};

/**
 * Focus scope in a modal-like container.
 */
export const ModalExample: Story = {
  args: {
    contain: true,
    autoFocus: true,
    restoreFocus: true,
    children: (
      <div style={{padding: "2rem", background: "white", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: "400px"}}>
        <h2 style={{marginBottom: "1rem"}}>Sign In</h2>
        <input
          type='email'
          placeholder='Email'
          style={{width: "100%", padding: "0.75rem", marginBottom: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
        />
        <input
          type='password'
          placeholder='Password'
          style={{width: "100%", padding: "0.75rem", marginBottom: "1rem", borderRadius: "4px", border: "1px solid #d1d5db"}}
        />
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            style={{flex: 1, padding: "0.75rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px"}}>
            Sign In
          </button>
          <button
            type='button'
            style={{flex: 1, padding: "0.75rem", background: "#e5e7eb", color: "#111827", border: "none", borderRadius: "4px"}}>
            Cancel
          </button>
        </div>
      </div>
    ),
  },
};
