import {Eye, Pencil, Trash2} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Spinner} from "./spinner";
import {VisuallyHidden} from "./visually-hidden";
import styles from "./visually-hidden.module.css";

const meta = {
  title: "Components/Utilities/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
  args: {children: "Hidden label"},
} satisfies Meta<typeof VisuallyHidden>;
export default meta;
type Story = StoryObj<typeof meta>;

export const IconButton: Story = {
  render: () => (
    <Button size='icon'>
      <Trash2 aria-hidden='true' />
      <VisuallyHidden>Delete item</VisuallyHidden>
    </Button>
  ),
};
export const IconGroup: Story = {
  render: () => (
    <div className={styles.storyRow}>
      <Button
        size='icon-sm'
        variant='secondary'>
        <Pencil aria-hidden='true' />
        <VisuallyHidden>Edit</VisuallyHidden>
      </Button>
      <Button
        size='icon-sm'
        variant='secondary'>
        <Eye aria-hidden='true' />
        <VisuallyHidden>View</VisuallyHidden>
      </Button>
      <Button
        size='icon-sm'
        variant='destructive'>
        <Trash2 aria-hidden='true' />
        <VisuallyHidden>Delete</VisuallyHidden>
      </Button>
    </div>
  ),
};
/** The static spinner is decorative; the real button gets its full hidden name. */
export const FormStatus: Story = {
  render: () => (
    <Button disabled>
      <Spinner
        animated={false}
        aria-hidden='true'
        role='presentation'
      />
      <VisuallyHidden>Submitting form</VisuallyHidden>Submitting
    </Button>
  ),
};
