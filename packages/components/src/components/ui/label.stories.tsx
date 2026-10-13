import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import {Input} from "./input";
import {Label} from "./label";
import styles from "./label.module.css";

const meta = {
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
    <div className={styles.storyStack}>
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
    <div className={styles.storyInline}>
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
    <div className={styles.storyStack}>
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
      className={styles.storyStack}>
      <legend>Unavailable preferences</legend>
      <Label htmlFor='disabled-name'>Display name</Label>
      <Input
        id='disabled-name'
        defaultValue='Read-only preview'
      />
    </fieldset>
  ),
};
