import {useId, useRef, useState, type ReactElement} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Button} from "./button";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "./dialog";
import styles from "./dialog.module.css";

const meta = {
  title: "Components/Feedback/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Base UI owns modal/focus behavior. Content now appends an icon Close by default; exported DialogClose is unstyled. Footer Close is opt-in. Compose Buttons through render, never by nesting buttons.",
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (): ReactElement => (
    <Dialog>
      <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review details</DialogTitle>
          <DialogDescription>Review the information before continuing.</DialogDescription>
        </DialogHeader>
        <p>The content is above the backdrop. Close controls can be customized independently.</p>
        <DialogFooter>
          <DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
          <DialogClose render={<Button />}>Continue</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Simple: Story = {
  render: (): ReactElement => (
    <Dialog>
      <DialogTrigger render={<Button variant='outline' />}>Simple Dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notice</DialogTitle>
          <DialogDescription>Dismiss with the automatic icon or Escape.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

function WithFormDemo(): ReactElement {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Open Form Dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
          <DialogDescription>This example keeps form values in the caller.</DialogDescription>
        </DialogHeader>
        <div className={styles.formFields}>
          <label
            className={styles.field}
            htmlFor={`${id}-name`}>
            Name
            <input
              id={`${id}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label
            className={styles.field}
            htmlFor={`${id}-email`}>
            Email
            <input
              id={`${id}-email`}
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        </div>
        <DialogFooter showCloseButton>
          <Button>Save draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const WithForm: Story = {render: (): ReactElement => <WithFormDemo />};

export const Scrollable: Story = {
  render: (): ReactElement => (
    <Dialog>
      <DialogTrigger render={<Button variant='outline' />}>Scrollable Content</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Long-form details</DialogTitle>
          <DialogDescription>Content scrolls inside the bounded popup.</DialogDescription>
        </DialogHeader>
        <div className={styles.scrollContent}>
          {Array.from({length: 12}, (_, index) => (
            <p key={index}>Section {index + 1}: review the details and use the explicit controls when finished.</p>
          ))}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
};

export const CustomWidth: Story = {
  render: (): ReactElement => (
    <Dialog>
      <DialogTrigger render={<Button />}>Wide Dialog</DialogTrigger>
      <DialogContent
        className={styles.wide}
        showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Custom width</DialogTitle>
          <DialogDescription>A caller CSS Module changes width; the automatic icon is disabled.</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
};

function FocusContractDemo(): ReactElement {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.formFields}>
      <p>
        Open by keyboard. Focus enters the field. Check Tab and Shift+Tab containment, nested Escape dismissal, background inertness, and
        focus return to each trigger in a real browser.
      </p>
      <Dialog>
        <DialogTrigger render={<Button />}>Open focus contract</DialogTrigger>
        <DialogContent initialFocus={input}>
          <DialogHeader>
            <DialogTitle>Focus contract</DialogTitle>
            <DialogDescription>The automatic close follows all supplied content in DOM order.</DialogDescription>
          </DialogHeader>
          <label
            className={styles.field}
            htmlFor={id}>
            First field
            <input
              ref={input}
              id={id}
            />
          </label>
          <Dialog>
            <DialogTrigger render={<Button variant='outline' />}>Open nested dialog</DialogTrigger>
            <DialogContent>
              <DialogTitle>Nested focus contract</DialogTitle>
              <DialogDescription>Escape closes only this topmost dialog and returns focus to its trigger.</DialogDescription>
              <DialogClose render={<Button variant='outline' />}>Return to parent</DialogClose>
            </DialogContent>
          </Dialog>
          <DialogFooter>
            <DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button variant='outline'>Background focus target</Button>
    </div>
  );
}

export const FocusContract: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Interactive native-focus documentation, not automated proof. Vitest asserts the real controller's focus requests, emitted hidden/inert state and cancellations under happy-dom; native tab/inert enforcement needs browser inspection.",
      },
    },
  },
  render: (): ReactElement => <FocusContractDemo />,
};
