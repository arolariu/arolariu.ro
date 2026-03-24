import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Alert, AlertDescription, AlertTitle} from "./alert";

const meta = {
  title: "Components/Feedback/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
      description: "Visual tone for the alert",
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>This is a default alert with informational content.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant='destructive'>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong. Please try again later.</AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <Alert>
      <AlertDescription>A simple alert with just a description.</AlertDescription>
    </Alert>
  ),
};

/**
 * Informational alert variant for general information.
 */
function InfoAlert(): React.JSX.Element {
  return (
    <Alert style={{borderColor: "#3b82f6", backgroundColor: "#eff6ff"}}>
      <div style={{display: "flex", alignItems: "start", gap: "12px"}}>
        <svg
          style={{width: "20px", height: "20px", color: "#3b82f6", flexShrink: 0}}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <div>
          <AlertTitle style={{color: "#1e40af"}}>Information</AlertTitle>
          <AlertDescription style={{color: "#1e3a8a"}}>
            Your session will expire in 5 minutes. Please save your work.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

export const Info: Story = {
  render: () => <InfoAlert />,
};

/**
 * Success alert variant for positive feedback.
 */
function SuccessAlert(): React.JSX.Element {
  return (
    <Alert style={{borderColor: "#22c55e", backgroundColor: "#f0fdf4"}}>
      <div style={{display: "flex", alignItems: "start", gap: "12px"}}>
        <svg
          style={{width: "20px", height: "20px", color: "#22c55e", flexShrink: 0}}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <div>
          <AlertTitle style={{color: "#15803d"}}>Success</AlertTitle>
          <AlertDescription style={{color: "#166534"}}>
            Your changes have been saved successfully.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

export const Success: Story = {
  render: () => <SuccessAlert />,
};

/**
 * Alert with an action button for user interaction.
 */
function AlertWithAction(): React.JSX.Element {
  const [visible, setVisible] = React.useState(true);

  if (!visible) {
    return (
      <div style={{padding: "16px", textAlign: "center", color: "#6b7280"}}>
        Alert dismissed
      </div>
    );
  }

  return (
    <Alert>
      <div style={{display: "flex", alignItems: "start", justifyContent: "space-between", gap: "12px"}}>
        <div style={{flex: 1}}>
          <AlertTitle>Cookie Notice</AlertTitle>
          <AlertDescription>
            We use cookies to enhance your browsing experience. By continuing, you accept our cookie policy.
          </AlertDescription>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding: "4px 12px",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "14px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Dismiss
        </button>
      </div>
    </Alert>
  );
}

export const WithAction: Story = {
  render: () => <AlertWithAction />,
};
