import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {LoadingOverlay} from "./loading-overlay";

const meta = {
  title: "Components/Feedback/LoadingOverlay",
  component: LoadingOverlay,
  tags: ["autodocs"],
  argTypes: {
    visible: {
      control: "boolean",
      description: "Whether the overlay should be rendered",
    },
    blur: {
      control: "boolean",
      description: "Whether a backdrop blur effect should be applied behind the overlay",
    },
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading overlay with default spinner.
 */
export const Default: Story = {
  args: {
    visible: true,
    blur: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#f3f4f6", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem"}}>Content underneath</h3>
      <p style={{marginBottom: "0.5rem"}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <p>This content is blocked by the loading overlay.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};

/**
 * Loading overlay with blur effect.
 */
export const WithBlur: Story = {
  args: {
    visible: true,
    blur: true,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#f3f4f6", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem"}}>Content underneath</h3>
      <p style={{marginBottom: "0.5rem"}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <p>This content is blurred by the loading overlay.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};

/**
 * Hidden loading overlay.
 */
export const Hidden: Story = {
  args: {
    visible: false,
  },
  render: (args) => (
    <div
      style={{position: "relative", height: "300px", padding: "2rem", background: "#efe", border: "1px solid #cfc", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", color: "#060"}}>✓ Content is accessible</h3>
      <p style={{color: "#030"}}>The loading overlay is hidden, so this content is fully interactive.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};

/**
 * Loading overlay with progress percentage.
 */
export const WithProgress: Story = {
  args: {
    visible: true,
    blur: true,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#f3f4f6", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem"}}>Uploading files...</h3>
      <p style={{marginBottom: "0.5rem"}}>This operation may take a few moments.</p>
      <LoadingOverlay {...args}>
        <div style={{textAlign: "center", marginTop: "16px"}}>
          <div style={{fontSize: "32px", fontWeight: "bold", color: "#3b82f6", marginBottom: "8px"}}>67%</div>
          <div style={{fontSize: "14px", color: "#6b7280"}}>Uploading 3 of 10 files</div>
        </div>
      </LoadingOverlay>
    </div>
  ),
};

/**
 * Loading overlay with custom pulsing dots spinner.
 */
export const CustomSpinner: Story = {
  args: {
    visible: true,
    blur: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#1f2937", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", color: "#f9fafb"}}>Processing payment...</h3>
      <p style={{color: "#d1d5db"}}>Please do not close this window.</p>
      <LoadingOverlay {...args}>
        <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#3b82f6",
                animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </LoadingOverlay>
    </div>
  ),
};

/**
 * Transparent overlay without blur effect.
 */
export const Transparent: Story = {
  args: {
    visible: true,
    blur: false,
  },
  render: (args) => (
    <div
      style={{
        position: "relative",
        height: "300px",
        padding: "2rem",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "8px",
      }}>
      <h3 style={{marginBottom: "1rem", color: "white"}}>Premium Content</h3>
      <p style={{color: "rgba(255,255,255,0.9)"}}>Background remains visible with semi-transparent overlay.</p>
      <LoadingOverlay
        {...args}
        style={{background: "rgba(0,0,0,0.4)"}}
      />
    </div>
  ),
};
