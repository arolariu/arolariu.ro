"use client";

import {Check, Info as InfoIcon, X} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "./alert";
import {Button} from "./button";

const meta = {
  title: "Components/Feedback/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {variant: {control: "select", options: ["default", "destructive"]}},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (): React.JSX.Element => (
    <Alert>
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>This is a default alert with informational content.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: (): React.JSX.Element => (
    <Alert variant='destructive'>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>Connection failed</AlertTitle>
      <AlertDescription>
        Try again or <a href='#status'>check the service status</a>.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: (): React.JSX.Element => (
    <Alert>
      <AlertDescription>A simple alert with just a description.</AlertDescription>
    </Alert>
  ),
};

/** Free-form children flow as written: without an AlertAction the alert is not a grid. */
export const FreeFormContent: Story = {
  render: (): React.JSX.Element => (
    <Alert>
      Your session expired. <a href='#sign-in'>Sign in again</a> to keep your unsaved changes.
      <p>Drafts stay on this device for 24 hours.</p>
    </Alert>
  ),
};

export const Info: Story = {
  render: (): React.JSX.Element => (
    <Alert>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>Session ending soon</AlertTitle>
      <AlertDescription>
        <p>Please save your work.</p>
        <a href='#help'>Learn about session recovery</a>
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: (): React.JSX.Element => (
    <Alert role='status'>
      <Check aria-hidden='true' />
      <AlertTitle>Changes saved</AlertTitle>
      <AlertDescription>Your changes are now available.</AlertDescription>
    </Alert>
  ),
};

function AlertWithAction(): React.JSX.Element {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return <p role='status'>Alert dismissed</p>;
  return (
    <Alert>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>Storage almost full</AlertTitle>
      <AlertDescription>
        Remove unused files or <a href='#storage'>review your storage</a>.
      </AlertDescription>
      <AlertAction>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setVisible(false)}>
          <X aria-hidden='true' /> Dismiss
        </Button>
      </AlertAction>
    </Alert>
  );
}

export const WithAction: Story = {render: (): React.JSX.Element => <AlertWithAction />};

export const RightToLeft: Story = {
  render: (): React.JSX.Element => (
    <Alert dir='rtl'>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>Notice in a right-to-left layout</AlertTitle>
      <AlertDescription>The leading icon and trailing action follow the reading direction.</AlertDescription>
      <AlertAction>
        <Button size='sm'>Review</Button>
      </AlertAction>
    </Alert>
  ),
};
