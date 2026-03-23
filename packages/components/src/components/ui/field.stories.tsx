import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Field, FieldContent, FieldDescription, FieldError, FieldLabel} from "./field";
import {Input} from "./input";

const meta = {
  title: "Components/Forms/Field",
  component: Field,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic field with label and input.
 */
export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='email'>Email address</FieldLabel>
      <FieldContent>
        <Input
          id='email'
          type='email'
          placeholder='you@example.com'
        />
      </FieldContent>
    </Field>
  ),
};

/**
 * Field with label, description, and helper text.
 */
export const WithDescription: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='username'>Username</FieldLabel>
      <FieldDescription>Choose a unique username. This will be your public identifier.</FieldDescription>
      <FieldContent>
        <Input
          id='username'
          placeholder='johndoe'
        />
      </FieldContent>
    </Field>
  ),
};

/**
 * Field with validation error.
 */
export const WithError: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='password'>Password</FieldLabel>
      <FieldContent>
        <Input
          id='password'
          type='password'
          placeholder='Enter password'
          aria-invalid='true'
        />
      </FieldContent>
      <FieldError errors={[{message: "Password must be at least 8 characters"}]} />
    </Field>
  ),
};
