import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";
import {Input} from "./input";
import styles from "./field.module.css";

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
      <FieldContent>
        <Input
          id='username'
          aria-describedby='username-hint'
          placeholder='johndoe'
        />
        <FieldDescription id='username-hint'>Choose a unique username. This will be your public identifier.</FieldDescription>
      </FieldContent>
    </Field>
  ),
};

/**
 * Field with validation error.
 */
export const WithError: Story = {
  render: () => (
    <Field data-invalid='true'>
      <FieldLabel htmlFor='password'>Password</FieldLabel>
      <FieldContent>
        <Input
          id='password'
          type='password'
          placeholder='Enter password'
          aria-invalid='true'
          aria-describedby='password-error'
        />
      </FieldContent>
      <FieldError
        id='password-error'
        errors={[{message: "Password must be at least 8 characters"}, {message: "Password must be at least 8 characters"}]}
      />
    </Field>
  ),
};

/**
 * Field with an accessible required indicator.
 */
export const Required: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='email'>Email address (required)</FieldLabel>
      <FieldContent>
        <Input
          id='email'
          type='email'
          placeholder='you@example.com'
          required
          aria-describedby='required-email-hint'
        />
      </FieldContent>
      <FieldDescription id='required-email-hint'>Required field - must be a valid email address</FieldDescription>
    </Field>
  ),
};

/**
 * Field with horizontal label and input layout.
 */
export const Horizontal: Story = {
  render: () => (
    <Field orientation='horizontal'>
      <FieldLabel htmlFor='horizontal-username'>Username:</FieldLabel>
      <FieldContent>
        <Input
          id='horizontal-username'
          placeholder='johndoe'
        />
      </FieldContent>
    </Field>
  ),
};

/**
 * A caller-owned description relationship; no tooltip provider is necessary.
 */
export const WithHint: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='recovery-address'>Recovery address</FieldLabel>
      <FieldContent>
        <Input
          id='recovery-address'
          type='email'
          placeholder='you@example.com'
          aria-describedby='recovery-hint'
        />
      </FieldContent>
      <FieldDescription id='recovery-hint'>Use an address you can access.</FieldDescription>
    </Field>
  ),
};

/** A narrow container stays stacked even on a wide Storybook viewport. */
export const ResponsiveNarrow: Story = {
  render: () => (
    <FieldGroup className={styles.storyNarrow}>
      <Field orientation='responsive'>
        <FieldLabel htmlFor='narrow-email'>Email</FieldLabel>
        <FieldContent>
          <Input
            id='narrow-email'
            type='email'
          />
          <FieldDescription>Responsive to this container, not the viewport.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const ResponsiveWide: Story = {
  parameters: {layout: "padded"},
  render: () => (
    <FieldGroup className={styles.storyWide}>
      <Field orientation='responsive'>
        <FieldLabel htmlFor='wide-email'>Email</FieldLabel>
        <FieldContent>
          <Input
            id='wide-email'
            type='email'
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

/** Native fieldset/legend naming, disabled association, section separators and title. */
export const DisabledFieldset: Story = {
  render: () => (
    <FieldSet disabled>
      <FieldLegend>Contact preferences</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='disabled-contact'>Email</FieldLabel>
          <FieldContent>
            <Input id='disabled-contact' />
          </FieldContent>
        </Field>
        <FieldSeparator>Other details</FieldSeparator>
        <Field>
          <FieldTitle>Unavailable while preferences are locked</FieldTitle>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

export const NormalizedErrors: Story = {
  render: () => (
    <FieldError errors={[undefined, {message: "  Required  "}, {message: "Required"}, {message: ""}, {message: "Use a valid value"}]} />
  ),
};
