import {type JSX, useRef, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Field, FieldDescription, FieldError, FieldLabel} from "./field";
import {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS} from "./input-otp";

const meta = {
  title: "Components/Forms/InputOTP",
  component: InputOTP,
  args: {
    maxLength: 6,
    "aria-label": "Verification code",
    children: (
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <InputOTPSlot
            key={index}
            index={index}
          />
        ))}
      </InputOTPGroup>
    ),
  },
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InputOTP>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default OTP input with 6 digits.
 */
export const Default: Story = {
  render: () => (
    <InputOTP
      maxLength={6}
      aria-label='Verification code'>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

/**
 * OTP input with separator between groups for better readability.
 */
export const WithSeparator: Story = {
  render: () => (
    <InputOTP
      maxLength={6}
      aria-label='Grouped verification code'>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

/**
 * OTP input with pattern validation (digits only).
 */
export const DigitsOnly: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='digit-code'>Enter verification code</FieldLabel>
      <InputOTP
        id='digit-code'
        aria-describedby='digit-code-hint'
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription id='digit-code-hint'>Enter the six digits from your verification message.</FieldDescription>
    </Field>
  ),
};

/**
 * Four-digit PIN input for security verification.
 */
export const FourDigitPIN: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor='pin-code'>Enter your PIN</FieldLabel>
      <InputOTP
        id='pin-code'
        aria-describedby='pin-code-hint'
        maxLength={4}
        pattern={REGEXP_ONLY_DIGITS}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription id='pin-code-hint'>Enter your four-digit PIN.</FieldDescription>
    </Field>
  ),
};

/**
 * Actual invalid input state styles all slots and links its error.
 */
export const WithError: Story = {
  render: () => (
    <Field data-invalid='true'>
      <FieldLabel htmlFor='invalid-code'>Enter verification code</FieldLabel>
      <InputOTP
        id='invalid-code'
        aria-invalid='true'
        aria-describedby='invalid-code-error'
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldError id='invalid-code-error'>Invalid code. Please check and try again.</FieldError>
    </Field>
  ),
};

/**
 * OTP input that auto-focuses the first slot on mount.
 */
function AutoFocusDemo(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Field>
      <FieldLabel htmlFor='autofocus-code'>Two-factor authentication code</FieldLabel>
      <InputOTP
        id='autofocus-code'
        aria-describedby='autofocus-code-hint'
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        autoFocus
        ref={inputRef}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription id='autofocus-code-hint'>The backing input receives native autofocus.</FieldDescription>
    </Field>
  );
}

export const AutoFocus: Story = {
  render: () => <AutoFocusDemo />,
};

function PasteDemo(): JSX.Element {
  const [value, setValue] = useState("");
  const [completed, setCompleted] = useState("");
  return (
    <Field>
      <FieldLabel htmlFor='paste-code'>Paste a code such as 12-34</FieldLabel>
      <InputOTP
        id='paste-code'
        maxLength={4}
        pattern={REGEXP_ONLY_DIGITS}
        value={value}
        onChange={setValue}
        onComplete={setCompleted}
        pasteTransformer={(text) => text.replaceAll("-", "")}>
        <InputOTPGroup>
          {[0, 1, 2, 3].map((index) => (
            <InputOTPSlot
              key={index}
              index={index}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <output aria-live='polite'>{completed ? `Completed: ${completed}` : "Waiting for four digits"}</output>
    </Field>
  );
}

export const ControlledPaste: Story = {render: () => <PasteDemo />};

export const Disabled: Story = {
  render: () => (
    <InputOTP
      maxLength={4}
      aria-label='Disabled code'
      disabled
      value='1234'>
      <InputOTPGroup>
        {[0, 1, 2, 3].map((index) => (
          <InputOTPSlot
            key={index}
            index={index}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const Alphanumeric: Story = {
  render: () => (
    <InputOTP
      maxLength={4}
      aria-label='Alphanumeric code'
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      placeholder='AB12'>
      <InputOTPGroup>
        {[0, 1, 2, 3].map((index) => (
          <InputOTPSlot
            key={index}
            index={index}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
};
