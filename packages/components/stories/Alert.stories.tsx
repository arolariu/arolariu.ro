import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Alert, AlertDescription, AlertTitle } from "../dist";
import {
  InfoIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react";

const meta: Meta<typeof Alert> = {
  title: "Design System/Alert",
  component: Alert,
};

export default meta;

type Story = StoryObj<typeof Alert>;

// Default alert
export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Default Alert</AlertTitle>
      <AlertDescription>
        This is a default alert — check it out!
      </AlertDescription>
    </Alert>
  ),
};

// Destructive alert
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Error Alert</AlertTitle>
      <AlertDescription>
        There was a problem with your request. Please try again.
      </AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Info
export const InfoAlert: Story = {
  render: () => (
    <Alert>
      <InfoIcon />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This feature will be available in the next update.
      </AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Warning
export const WarningAlert: Story = {
  render: () => (
    <Alert>
      <AlertTriangleIcon className="text-amber-500" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription className="text-amber-500/90">
        Your account is about to expire. Please renew your subscription.
      </AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Error
export const ErrorAlert: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again to continue.
      </AlertDescription>
    </Alert>
  ),
};

// Alert with icon - Success
export const SuccessAlert: Story = {
  render: () => (
    <Alert>
      <CheckCircle2Icon className="text-green-500" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription className="text-green-500/90">
        Your changes have been saved successfully!
      </AlertDescription>
    </Alert>
  ),
};

// Custom styled alert
export const CustomStyledAlert: Story = {
  render: () => (
    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
      <InfoIcon className="text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-700 dark:text-blue-300">Note</AlertTitle>
      <AlertDescription className="text-blue-600 dark:text-blue-400">
        This is a custom styled alert with blue theming. You can customize
        alerts to match your brand colors.
      </AlertDescription>
    </Alert>
  ),
};

// Multiple paragraphs
export const MultiParagraph: Story = {
  render: () => (
    <Alert>
      <AlertTriangleIcon className="text-amber-500" />
      <AlertTitle>System Maintenance</AlertTitle>
      <AlertDescription>
        <p>
          The system will be undergoing scheduled maintenance on April 30, 2025,
          from 2:00 AM to 4:00 AM UTC.
        </p>
        <p>
          During this time, the service will be unavailable. We apologize for
          any inconvenience.
        </p>
      </AlertDescription>
    </Alert>
  ),
};
