import {useId, type ReactElement} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Button} from "./button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "./sheet";
import styles from "./sheet.module.css";

const meta = {
  title: "Components/Feedback/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A real Base UI modal from four viewport edges. The automatic icon close is last in DOM order and can be disabled. Exported SheetClose is unstyled; compose its presentation through render.",
      },
    },
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormSheet({side = "right", showCloseButton = true}: Readonly<{side?: SheetSide; showCloseButton?: boolean}>): ReactElement {
  const id = useId();
  return (
    <Sheet>
      <SheetTrigger render={<Button variant='outline' />}>Open from {side}</SheetTrigger>
      <SheetContent
        side={side}
        showCloseButton={showCloseButton}>
        <SheetHeader>
          <SheetTitle>Edit preferences</SheetTitle>
          <SheetDescription>Focus enters the first field; the icon close follows all content.</SheetDescription>
        </SheetHeader>
        <div className={styles.formFields}>
          <label
            className={styles.field}
            htmlFor={id}>
            Display name
            <input
              id={id}
              defaultValue='Alex'
            />
          </label>
          <label
            className={styles.field}
            htmlFor={`${id}-email`}>
            Email
            <input
              id={`${id}-email`}
              type='email'
              defaultValue='alex@example.com'
            />
          </label>
        </div>
        <SheetFooter>
          <Button>Save draft</Button>
          <SheetClose render={<Button variant='outline' />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export const Default: Story = {render: (): ReactElement => <FormSheet />};
export const FromLeft: Story = {render: (): ReactElement => <FormSheet side='left' />};
export const FromTop: Story = {render: (): ReactElement => <FormSheet side='top' />};
export const FromBottom: Story = {render: (): ReactElement => <FormSheet side='bottom' />};
export const WithForm: Story = {render: (): ReactElement => <FormSheet />};
export const WithoutAutomaticClose: Story = {render: (): ReactElement => <FormSheet showCloseButton={false} />};

export const LongContent: Story = {
  render: (): ReactElement => (
    <Sheet>
      <SheetTrigger render={<Button />}>Long Content</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Long-form details</SheetTitle>
          <SheetDescription>The sheet bounds scrolling to the viewport.</SheetDescription>
        </SheetHeader>
        {Array.from({length: 16}, (_, index) => (
          <p key={index}>Section {index + 1}: review these details before dismissing the panel.</p>
        ))}
        <SheetFooter>
          <SheetClose render={<Button variant='outline' />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WithFooter: Story = {
  render: (): ReactElement => (
    <Sheet>
      <SheetTrigger render={<Button />}>With Footer</SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Explicit dismissal</SheetTitle>
          <SheetDescription>The automatic icon is disabled; an unstyled Close composes a Button.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button variant='outline' />}>Cancel</SheetClose>
          <Button>Apply draft</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const FocusContract: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Open each edge by keyboard. Check initial focus, Tab/Shift+Tab containment, Escape, backdrop dismissal and focus return. The close icon is last for all four edges. This documents native inspection; happy-dom controller observations do not prove native inert enforcement.",
      },
    },
  },
  render: (): ReactElement => (
    <div className={styles.storyStack}>
      <p>Keyboard-focus and backdrop contract across all four edges.</p>
      <FormSheet side='top' />
      <FormSheet side='right' />
      <FormSheet side='bottom' />
      <FormSheet side='left' />
      <Button variant='outline'>Background focus target</Button>
    </div>
  ),
};
