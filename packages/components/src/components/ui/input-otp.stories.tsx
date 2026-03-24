import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, REGEXP_ONLY_DIGITS} from "./input-otp";

const meta = {
  title: "Components/Forms/InputOTP",
  component: InputOTP,
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
    <InputOTP maxLength={6}>
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
    <InputOTP maxLength={6}>
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
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Enter verification code</label>
      <InputOTP
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
      <p className='text-muted-foreground text-xs'>A 6-digit code was sent to your email</p>
    </div>
  ),
};

/**
 * Four-digit PIN input for security verification.
 */
export const FourDigitPIN: Story = {
  render: () => (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Enter your PIN</label>
      <InputOTP
        maxLength={4}
        pattern={REGEXP_ONLY_DIGITS}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <p className='text-muted-foreground text-xs'>Enter your 4-digit security PIN</p>
    </div>
  ),
};

/**
 * OTP input showing error state with red border styling.
 */
export const WithError: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "14px", fontWeight: 500}}>Enter verification code</label>
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}>
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
          <InputOTPSlot
            index={1}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
          <InputOTPSlot
            index={2}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot
            index={3}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
          <InputOTPSlot
            index={4}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
          <InputOTPSlot
            index={5}
            style={{borderColor: "#ef4444", borderWidth: "2px"}}
          />
        </InputOTPGroup>
      </InputOTP>
      <p style={{fontSize: "12px", color: "#ef4444", display: "flex", alignItems: "center", gap: "4px"}}>
        <svg
          style={{width: "14px", height: "14px"}}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        Invalid code. Please check and try again.
      </p>
    </div>
  ),
};

/**
 * OTP input that auto-focuses the first slot on mount.
 */
function AutoFocusDemo() {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "14px", fontWeight: 500}}>Two-Factor Authentication</label>
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        ref={inputRef as never}>
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
      <p style={{fontSize: "12px", color: "#6b7280"}}>The first field is automatically focused when the component loads</p>
    </div>
  );
}

export const AutoFocus: Story = {
  render: () => <AutoFocusDemo />,
};
