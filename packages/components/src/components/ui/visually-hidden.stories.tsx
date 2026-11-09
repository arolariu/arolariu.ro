import {Eye, Pencil, Trash2} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Spinner} from "./spinner";
import {VisuallyHidden} from "./visually-hidden";
const storyStyles = `
.ac-story-visually-hidden-storyRow {
  display: flex;
  gap: var(--ac-space-2);
}
`;

const storyClasses = {
  storyRow: "ac-story-visually-hidden-storyRow",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Utilities/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
  args: {children: "Hidden label"},
} satisfies Meta<typeof VisuallyHidden>;
export default meta;
type Story = StoryObj<typeof meta>;

export const IconButton: Story = {
  render: () => (
    <Button
      size='icon'
      aria-labelledby='vh-delete-item'>
      <Trash2 aria-hidden='true' />
      <VisuallyHidden id='vh-delete-item'>Delete item</VisuallyHidden>
    </Button>
  ),
};
export const IconGroup: Story = {
  render: () => (
    <div className={storyClasses.storyRow}>
      <Button
        size='icon-sm'
        aria-labelledby='vh-edit'
        variant='secondary'>
        <Pencil aria-hidden='true' />
        <VisuallyHidden id='vh-edit'>Edit</VisuallyHidden>
      </Button>
      <Button
        size='icon-sm'
        aria-labelledby='vh-view'
        variant='secondary'>
        <Eye aria-hidden='true' />
        <VisuallyHidden id='vh-view'>View</VisuallyHidden>
      </Button>
      <Button
        size='icon-sm'
        aria-labelledby='vh-delete'
        variant='destructive'>
        <Trash2 aria-hidden='true' />
        <VisuallyHidden id='vh-delete'>Delete</VisuallyHidden>
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
