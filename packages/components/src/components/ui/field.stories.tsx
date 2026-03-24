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

/**
 * Field with required asterisk indicator.
 */
export const Required: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='email'>
        Email address <span style={{color: "#ef4444"}}>*</span>
      </FieldLabel>
      <FieldContent>
        <Input
          id='email'
          type='email'
          placeholder='you@example.com'
          required
        />
      </FieldContent>
      <FieldDescription>Required field - must be a valid email address</FieldDescription>
    </Field>
  ),
};

/**
 * Field with horizontal label and input layout.
 */
export const Horizontal: Story = {
  render: () => (
    <Field>
      <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
        <FieldLabel
          htmlFor='username'
          style={{minWidth: "120px", marginBottom: 0}}>
          Username:
        </FieldLabel>
        <FieldContent style={{flex: 1}}>
          <Input
            id='username'
            placeholder='johndoe'
          />
        </FieldContent>
      </div>
    </Field>
  ),
};

/**
 * Field with help icon tooltip.
 */
export const WithHint: Story = {
  render: () => (
    <Field>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <FieldLabel htmlFor='api-key'>API Key</FieldLabel>
        <span
          title='Your unique API key for authentication. Keep this secret!'
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "16px",
            height: "16px",
            background: "#3b82f6",
            color: "white",
            borderRadius: "50%",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
          }}>
          ?
        </span>
      </div>
      <FieldContent>
        <Input
          id='api-key'
          type='password'
          placeholder='sk_live_...'
        />
      </FieldContent>
      <FieldDescription>This key provides full access to your account</FieldDescription>
    </Field>
  ),
};
