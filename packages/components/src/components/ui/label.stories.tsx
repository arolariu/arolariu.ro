import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import {Input} from "./input";
import {Label} from "./label";
const storyStyles = `
.ac-story-label-storyStack {
  display: grid;
  gap: var(--ac-space-2);
}

.ac-story-label-storyInline {
  display: flex;
  align-items: center;
  gap: var(--ac-space-2);
}
`;

const storyClasses = {
  storyStack: "ac-story-label-storyStack",
  storyInline: "ac-story-label-storyInline",
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
  title: "Components/Forms/Label",
  component: Label,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Label with associated text input.
 */
export const WithInput: Story = {
  render: () => (
    <div className={storyClasses.storyStack}>
      <Label htmlFor='email-input'>Email address</Label>
      <Input
        id='email-input'
        type='email'
        placeholder='you@example.com'
      />
    </div>
  ),
};

/**
 * Label with checkbox control.
 */
export const WithCheckbox: Story = {
  render: () => (
    <div className={storyClasses.storyInline}>
      <Checkbox id='terms' />
      <Label htmlFor='terms'>Accept terms and conditions</Label>
    </div>
  ),
};

/**
 * Label with required indicator.
 */
export const Required: Story = {
  render: () => (
    <div className={storyClasses.storyStack}>
      <Label htmlFor='username'>Username (required)</Label>
      <Input
        id='username'
        placeholder='Enter username'
        required
      />
    </div>
  ),
};

/** Native fieldset semantics disable the associated control without a new context. */
export const DisabledFieldset: Story = {
  render: () => (
    <fieldset
      disabled
      className={storyClasses.storyStack}>
      <legend>Unavailable preferences</legend>
      <Label htmlFor='disabled-name'>Display name</Label>
      <Input
        id='disabled-name'
        defaultValue='Read-only preview'
      />
    </fieldset>
  ),
};
