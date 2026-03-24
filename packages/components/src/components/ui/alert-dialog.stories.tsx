import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

const meta = {
  title: "Components/Feedback/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default alert dialog with destructive action confirmation.
 */
export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger>Delete Account</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Alert dialog with only a confirmation action, no cancel button.
 */
export const WithoutCancel: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger>Acknowledge</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Terms and Conditions Updated</AlertDialogTitle>
          <AlertDialogDescription>We have updated our terms and conditions. Please review them before continuing.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>I Understand</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Alert dialog with long content to demonstrate scrolling behavior.
 */
export const WithLongContent: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger>View Details</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Data Processing Notice</AlertDialogTitle>
          <AlertDialogDescription>
            By continuing, you agree to our data processing terms. We collect, store, and process your personal information in accordance
            with applicable privacy laws. Your data may be shared with third-party service providers who assist us in operating our
            platform. You have the right to access, modify, or delete your personal data at any time. For more information, please review
            our complete privacy policy available on our website.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Decline</AlertDialogCancel>
          <AlertDialogAction>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Alert dialog triggered by a custom element.
 */
export const CustomTrigger: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger className='bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-6 py-3 font-semibold'>
        Delete Everything
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Critical Action</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete all data. This action is irreversible and will affect all users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back</AlertDialogCancel>
          <AlertDialogAction>Delete All</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Destructive confirmation dialog for critical actions like account deletion.
 */
export const DestructiveConfirm: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger
        style={{
          background: "#ef4444",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 500,
        }}>
        Delete Account
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle style={{color: "#dc2626"}}>⚠️ Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            <div style={{display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px"}}>
              <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  padding: "12px",
                  fontSize: "14px",
                }}>
                <strong style={{color: "#dc2626"}}>What will be deleted:</strong>
                <ul style={{marginTop: "8px", marginLeft: "20px", color: "#991b1b"}}>
                  <li>All personal information</li>
                  <li>All projects and files</li>
                  <li>All comments and activity</li>
                  <li>All billing information</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction style={{background: "#dc2626", color: "#fff"}}>Yes, Delete My Account</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Confirmation dialog with a "Don't show again" checkbox option.
 */
function WithCheckboxDemo() {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        style={{background: "#3b82f6", color: "#fff", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer"}}>
        Show Tutorial
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome Tutorial</AlertDialogTitle>
          <AlertDialogDescription>
            <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
              <p>Would you like to start the interactive tutorial? It will guide you through the main features of the application.</p>
              <div style={{display: "flex", alignItems: "center", gap: "8px", paddingTop: "8px"}}>
                <input
                  type='checkbox'
                  id='dont-show'
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  style={{width: "16px", height: "16px", cursor: "pointer"}}
                />
                <label
                  htmlFor='dont-show'
                  style={{fontSize: "14px", cursor: "pointer"}}>
                  Don't show this message again
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => console.log("Skipped. Don't show again:", dontShowAgain)}>Skip Tutorial</AlertDialogCancel>
          <AlertDialogAction onClick={() => console.log("Starting tutorial. Don't show again:", dontShowAgain)}>
            Start Tutorial
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const WithCheckbox: Story = {
  render: () => <WithCheckboxDemo />,
};
