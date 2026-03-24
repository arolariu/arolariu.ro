import {useState} from "react";
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

/**
 * Focus scope simulating a modal dialog focus trap.
 */
export const ModalTrap: Story = {
  args: {
    contain: true,
    autoFocus: true,
    restoreFocus: true,
    children: (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          maxWidth: "500px",
          width: "90%",
        }}>
        <h2 style={{fontSize: "24px", fontWeight: "700", marginBottom: "16px"}}>Confirm Action</h2>
        <p style={{color: "#6b7280", marginBottom: "24px", lineHeight: "1.5"}}>
          Are you sure you want to proceed? This action cannot be undone. Focus is trapped within this modal until you make a choice.
        </p>
        <div style={{display: "flex", gap: "12px", justifyContent: "flex-end"}}>
          <button
            type='button'
            style={{
              padding: "10px 20px",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}>
            Cancel
          </button>
          <button
            type='button'
            style={{
              padding: "10px 20px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}>
            Confirm
          </button>
        </div>
      </div>
    ),
  },
  render: (args) => (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
      />
      <FocusScope {...args} />
    </>
  ),
};

/**
 * Focus scope that restores focus when closed.
 */
function RestoreFocusDemo(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{padding: "24px"}}>
      <p style={{marginBottom: "16px", color: "#6b7280"}}>
        Click the button below to open a dialog. When closed, focus returns to the trigger button.
      </p>
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        style={{
          padding: "10px 20px",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "500",
        }}>
        Open Dialog
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setIsOpen(false)}
          />
          <FocusScope
            contain
            autoFocus
            restoreFocus>
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                maxWidth: "400px",
              }}>
              <h3 style={{marginBottom: "12px"}}>Dialog Title</h3>
              <p style={{color: "#6b7280", marginBottom: "16px", fontSize: "14px"}}>
                This dialog captures focus. When you close it, focus will return to the trigger button.
              </p>
              <input
                type='text'
                placeholder='Type something...'
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              />
              <button
                type='button'
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "8px 16px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}>
                Close Dialog
              </button>
            </div>
          </FocusScope>
        </>
      )}
    </div>
  );
}

export const WithRestoreFocus: Story = {
  render: () => <RestoreFocusDemo />,
};
