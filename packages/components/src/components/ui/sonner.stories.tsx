import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Toaster, toast} from "./sonner";

const meta = {
  title: "Components/Feedback/Toast",
  component: Toaster,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default toast notification.
 */
export const Default: Story = {
  render: () => (
    <>
      <Button onClick={() => toast("Event has been created")}>Show Toast</Button>
      <Toaster />
    </>
  ),
};

/**
 * Success toast with description.
 */
export const Success: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast.success("Account created successfully", {
            description: "Welcome to the platform!",
          })
        }>
        Show Success Toast
      </Button>
      <Toaster />
    </>
  ),
};

/**
 * Error toast notification.
 */
export const Error: Story = {
  render: () => (
    <>
      <Button
        variant='destructive'
        onClick={() =>
          toast.error("Failed to save changes", {
            description: "Please try again later.",
          })
        }>
        Show Error Toast
      </Button>
      <Toaster />
    </>
  ),
};

/**
 * Promise toast showing loading, success, and error states.
 */
function simulateAsyncOperation(): Promise<{name: string}> {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 3000 + 1000;
    setTimeout(() => {
      Math.random() > 0.3 ? resolve({name: "John Doe"}) : reject(new Error("Network timeout"));
    }, delay);
  });
}

export const Promise: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast.promise(simulateAsyncOperation(), {
            loading: "Saving changes...",
            success: (data) => `Changes saved for ${data.name}!`,
            error: (err) => `Error: ${err.message}`,
          })
        }>
        Show Promise Toast
      </Button>
      <Toaster />
    </>
  ),
};

/**
 * Toast with action button for undo or dismiss.
 */
export const WithAction: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast("File deleted", {
            description: "Your file has been removed.",
            action: {
              label: "Undo",
              onClick: () => {
                toast.success("Deletion cancelled");
              },
            },
          })
        }>
        Show Toast with Action
      </Button>
      <Toaster />
    </>
  ),
};

/**
 * Toast with completely custom JSX content.
 */
export const Custom: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast.custom(
            (t) => (
              <div
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "16px",
                  borderRadius: "8px",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: "300px",
                }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}>
                  🎉
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: "600", marginBottom: "4px"}}>Premium Unlocked!</div>
                  <div style={{fontSize: "14px", opacity: 0.9}}>Enjoy all features for 30 days</div>
                </div>
                <button
                  type='button'
                  onClick={() => toast.dismiss(t)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}>
                  ✕
                </button>
              </div>
            ),
            {duration: 5000},
          )
        }>
        Show Custom Toast
      </Button>
      <Toaster />
    </>
  ),
};

/**
 * Toast with multiline formatted description.
 */
export const RichDescription: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast("Deployment Successful", {
            description: (
              <div style={{marginTop: "8px", fontSize: "13px", lineHeight: "1.5"}}>
                <div style={{marginBottom: "4px"}}>
                  <strong>Environment:</strong> Production
                </div>
                <div style={{marginBottom: "4px"}}>
                  <strong>Version:</strong> v2.4.1
                </div>
                <div>
                  <strong>Duration:</strong> 2m 34s
                </div>
              </div>
            ),
            duration: 6000,
          })
        }>
        Show Rich Description
      </Button>
      <Toaster />
    </>
  ),
};
