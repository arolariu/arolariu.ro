import {TriangleAlert} from "lucide-react";
import {useId, useRef, useState, type ReactElement} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogSize,
} from "./alert-dialog";
import {Button, type ButtonVariant} from "./button";
import styles from "./alert-dialog.module.css";

const meta = {
  title: "Components/Feedback/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Canonical Action is an ordinary Button: it does not close implicitly. Callers close explicitly on successful work. Cancel is Close-backed. Base UI 1.9 ignores backdrop dismissal but emits cancellable Escape requests; the library adds no business policy.",
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function ConfirmationDemo({
  size = "default",
  variant = "default",
  triggerVariant = "outline",
  showCancel = true,
  longContent = false,
  checkbox = false,
}: Readonly<{
  size?: AlertDialogSize;
  variant?: ButtonVariant;
  triggerVariant?: ButtonVariant;
  showCancel?: boolean;
  longContent?: boolean;
  checkbox?: boolean;
}>): ReactElement {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const id = useId();
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={triggerVariant} />}>Review confirmation</AlertDialogTrigger>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert aria-hidden='true' />
          </AlertDialogMedia>
          <AlertDialogTitle>Confirm this action?</AlertDialogTitle>
          <AlertDialogDescription>
            {longContent
              ? "Review every detail before continuing. This example shows a longer confirmation message that may wrap across several lines. The content stays bounded to the viewport, and all actions remain explicit. The caller decides how work is performed and when it succeeds."
              : "Review the details. The caller explicitly closes on confirmation."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {checkbox && (
          <label htmlFor={id}>
            <input
              id={id}
              type='checkbox'
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />{" "}
            Remember this preference
          </label>
        )}
        <AlertDialogFooter>
          {showCancel && <AlertDialogCancel size={size === "sm" ? "sm" : "default"}>Cancel</AlertDialogCancel>}
          <AlertDialogAction
            variant={variant}
            size={size === "sm" ? "sm" : "default"}
            onClick={() => setOpen(false)}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const Default: Story = {render: (): ReactElement => <ConfirmationDemo />};
export const WithoutCancel: Story = {render: (): ReactElement => <ConfirmationDemo showCancel={false} />};
export const WithLongContent: Story = {render: (): ReactElement => <ConfirmationDemo longContent />};
export const CustomTrigger: Story = {render: (): ReactElement => <ConfirmationDemo triggerVariant='secondary' />};
export const DestructiveConfirm: Story = {render: (): ReactElement => <ConfirmationDemo variant='destructive' />};
export const WithCheckbox: Story = {render: (): ReactElement => <ConfirmationDemo checkbox />};
export const SmallWithMedia: Story = {render: (): ReactElement => <ConfirmationDemo size='sm' />};

function ControlledAsyncDemo(): ReactElement {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const work = useRef<ReturnType<typeof Promise.withResolvers<void>> | null>(null);
  async function confirm(): Promise<void> {
    const request = Promise.withResolvers<void>();
    work.current = request;
    setPending(true);
    setError("");
    try {
      await request.promise;
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      work.current = null;
      setPending(false);
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        // This demonstration's owner cancels dismissal while work is pending, not the library.
        if (!nextOpen && pending) details.cancel();
        else setOpen(nextOpen);
      }}>
      <AlertDialogTrigger render={<Button variant='outline' />}>Controlled async confirmation</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Wait for work to finish</AlertDialogTitle>
          <AlertDialogDescription>Start work, then simulate success or rejection. Only success explicitly closes.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role='alert'
            className={styles.error}>
            {error}
          </p>
        )}
        {pending && (
          <div className={styles.storyStack}>
            <p role='status'>Work is pending.</p>
            <Button
              variant='secondary'
              onClick={() => work.current?.resolve()}>
              Simulate success
            </Button>
            <Button
              variant='outline'
              onClick={() => work.current?.reject(new Error("Work rejected; try again."))}>
              Simulate rejection
            </Button>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={confirm}>
            {pending ? "Working" : "Start work"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const ControlledAsync: Story = {render: (): ReactElement => <ControlledAsyncDemo />};

export const FocusContract: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Open by keyboard: focus enters Cancel, Tab/Shift+Tab moves among controls, Cancel returns focus to the trigger, and backdrop presses do not dismiss. Escape follows Base UI's cancellable contract. During pending work this example's owner cancels dismissal. Native focus containment/inert enforcement requires browser inspection; Vitest covers observable real-controller behavior only.",
      },
    },
  },
  render: (): ReactElement => (
    <div className={styles.storyStack}>
      <p>Check the default focus contract and the owner-controlled pending/error path.</p>
      <ConfirmationDemo />
      <ControlledAsyncDemo />
      <Button variant='outline'>Background focus target</Button>
    </div>
  ),
};
