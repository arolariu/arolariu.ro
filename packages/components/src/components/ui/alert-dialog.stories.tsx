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
          <AlertDialogDescription>
            We have updated our terms and conditions. Please review them before continuing.
          </AlertDialogDescription>
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
      <AlertDialogTrigger className='rounded-lg bg-destructive px-6 py-3 font-semibold text-destructive-foreground hover:bg-destructive/90'>
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
