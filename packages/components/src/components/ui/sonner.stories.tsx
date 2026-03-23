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
        variant="destructive"
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
