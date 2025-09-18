import type {Meta, StoryObj} from "@storybook/react";
import {AlertCircleIcon, AlertTriangleIcon, CheckCircle2Icon, InfoIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "../dist";

const meta: Meta<typeof Alert> = {
  title: "Design System/Alert",
  component: Alert,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Alert Component**

Displays a prominent message to attract user attention, often indicating status or important information. Based on simple div elements with variants controlled by \`cva\`.

**Core Components:**
*   \`<Alert>\`: The main container div. Accepts a \`variant\` prop ('default', 'destructive') to control styling.
*   \`<AlertTitle>\`: A heading element (usually \`<h5>\`) for the alert's title.
*   \`<AlertDescription>\`: A paragraph element (\`<p>\`) for the main body text of the alert.

**Key Features:**
*   Provides distinct visual styles for different alert types (e.g., default, destructive).
*   Designed to be used with icons (like those from \`lucide-react\`) placed directly within the \`<Alert>\` component for visual context.
*   Flexible structure allows for simple text or more complex content within the description.

See the [shadcn/ui Alert documentation](https://ui.shadcn.com/docs/components/alert) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    variant: {
      options: ["default", "destructive"],
      control: {type: "radio"},
      description: "The visual style of the alert.",
      table: {
        defaultValue: {summary: "default"},
      },
    },
    // Children are implicitly handled by the render function/args
  },
};

export default meta;

type Story = StoryObj<typeof Alert>;

// Default alert
export const Default: Story = {
  args: {
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "The default alert style, suitable for general information.",
      },
    },
  },
  render: (args) => (
    <Alert {...args}>
      <InfoIcon />
      <AlertTitle>Default Alert</AlertTitle>
      <AlertDescription>This is a default alert — check it out!</AlertDescription>
    </Alert>
  ),
};

// Destructive alert
export const Destructive: Story = {
  args: {
    variant: "destructive",
  },
  parameters: {
    docs: {
      description: {
        story: "The destructive alert style, used for errors or critical warnings.",
      },
    },
  },
  render: (args) => (
    <Alert {...args}>
      <AlertCircleIcon />
      <AlertTitle>Error Alert</AlertTitle>
      <AlertDescription>There was a problem with your request. Please try again.</AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Info
export const InfoAlert: Story = {
  render: () => (
    <Alert>
      <InfoIcon />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>This feature will be available in the next update.</AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Warning
export const WarningAlert: Story = {
  render: () => (
    <Alert>
      <AlertTriangleIcon className='text-amber-500' />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription className='text-amber-500/90'>Your account is about to expire. Please renew your subscription.</AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Error
export const ErrorAlert: Story = {
  render: () => (
    <Alert variant='destructive'>
      <AlertCircleIcon />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Your session has expired. Please log in again to continue.</AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Success
export const SuccessAlert: Story = {
  render: () => (
    <Alert>
      <CheckCircle2Icon className='text-green-500' />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription className='text-green-500/90'>Your changes have been saved successfully!</AlertDescription>
    </Alert>
  ),
};

// Custom styled alert
export const CustomStyledAlert: Story = {
  render: () => (
    <Alert className='border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'>
      <InfoIcon className='text-blue-600 dark:text-blue-400' />
      <AlertTitle className='text-blue-700 dark:text-blue-300'>Note</AlertTitle>
      <AlertDescription className='text-blue-600 dark:text-blue-400'>
        This is a custom styled alert with blue theming. You can customize alerts to match your brand colors.
      </AlertDescription>
    </Alert>
  ),
};

// Multiple paragraphs
export const MultiParagraph: Story = {
  render: () => (
    <Alert>
      <AlertTriangleIcon className='text-amber-500' />
      <AlertTitle>System Maintenance</AlertTitle>
      <AlertDescription>
        <p>The system will be undergoing scheduled maintenance on April 30, 2025, from 2:00 AM to 4:00 AM UTC.</p>
        <p>During this time, the service will be unavailable. We apologize for any inconvenience.</p>
      </AlertDescription>
    </Alert>
  ),
};
