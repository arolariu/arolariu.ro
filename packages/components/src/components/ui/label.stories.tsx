import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import {Input} from "./input";
import {Label} from "./label";

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
    <div className='space-y-2'>
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
    <div className='flex items-center space-x-2'>
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
    <div className='space-y-2'>
      <Label htmlFor='username'>
        Username <span className='text-destructive'>*</span>
      </Label>
      <Input
        id='username'
        placeholder='Enter username'
        required
      />
    </div>
  ),
};
