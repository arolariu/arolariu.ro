import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import {Button} from "./button";
import {LegacyAlertDialogAction} from "./legacy-alert-dialog-action";

const meta = {
  title: "Components/Feedback/LegacyAlertDialogAction",
  component: LegacyAlertDialogAction,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Explicit compatibility only: closes immediately, even if a handler returns pending work. Prefer canonical AlertDialogAction with owner-controlled success/error handling.",
      },
    },
  },
} satisfies Meta<typeof LegacyAlertDialogAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImmediateAcknowledgement: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant='outline' />}>Read notice</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notice updated</AlertDialogTitle>
          <AlertDialogDescription>
            This synchronous acknowledgement uses the old immediate-close behavior deliberately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LegacyAlertDialogAction>Acknowledge</LegacyAlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
