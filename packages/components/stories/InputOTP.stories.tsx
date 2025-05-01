import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  toast,
} from "../dist";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const meta: Meta<typeof InputOTP> = {
  title: "Design System/InputOTP",
  component: InputOTP,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof InputOTP>;

// Basic OTP input
export const Basic: Story = {
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

// OTP with separators
export const WithSeparators: Story = {
  render: () => (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSeparator />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSeparator />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

// Numeric OTP
export const NumericOTP: Story = {
  render: () => (
    <InputOTP maxLength={4} pattern="^[0-9]+$">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

// OTP with custom styling
export const CustomStyled: Story = {
  render: () => (
    <InputOTP maxLength={4}>
      <InputOTPGroup className="gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className="rounded-xl border-2 border-purple-400 focus:border-purple-600 aspect-square text-xl shadow-sm"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
};

// OTP with Form Validation
export const WithFormValidation: Story = {
  render: function OTPFormExample() {
    // Define form schema
    const formSchema = z.object({
      pin: z
        .string()
        .min(4, {
          message: "Your one-time password must be 4 characters.",
        })
        .max(4),
    });

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        pin: "",
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "OTP Verification",
        description: `You entered: ${values.pin}`,
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[350px]"
        >
          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>One-time password</FormLabel>
                <FormControl>
                  <InputOTP maxLength={4} {...field}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormDescription>
                  Please enter the one-time password sent to your device.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Verify</Button>
        </form>
      </Form>
    );
  },
};

// OTP with different sizes
export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <div className="mb-2 text-sm font-medium">Small</div>
        <InputOTP maxLength={4} size="sm">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Default</div>
        <InputOTP maxLength={4} size="default">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Large</div>
        <InputOTP maxLength={4} size="lg">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Custom Size</div>
        <InputOTP maxLength={4}>
          <InputOTPGroup className="gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="w-12 h-16 text-2xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>
  ),
};

// OTP with customized separator
export const CustomSeparator: Story = {
  render: () => (
    <InputOTP maxLength={6}>
      <InputOTPGroup className="gap-2">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSeparator className="text-xl font-bold text-blue-500">
          -
        </InputOTPSeparator>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSeparator className="text-xl font-bold text-blue-500">
          -
        </InputOTPSeparator>
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

// SMS verification example
export const SMSVerification: Story = {
  render: function SMSVerificationExample() {
    const [countdown, setCountdown] = React.useState(30);
    const [isCounting, setIsCounting] = React.useState(true);

    React.useEffect(() => {
      let timer: ReturnType<typeof setInterval>;

      if (isCounting && countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else if (countdown === 0) {
        setIsCounting(false);
      }

      return () => clearInterval(timer);
    }, [countdown, isCounting]);

    const handleResend = () => {
      setCountdown(30);
      setIsCounting(true);
      toast({
        title: "SMS Resent",
        description: "A new verification code has been sent to your phone.",
      });
    };

    // Define form schema
    const formSchema = z.object({
      smsCode: z
        .string()
        .min(6, {
          message: "Verification code must be 6 digits.",
        })
        .max(6),
    });

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        smsCode: "",
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "Verification Successful",
        description: "Your phone number has been verified.",
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[350px]"
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium">Verify your phone number</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              We've sent a 6-digit code to +1 (555) 123-4567
            </p>
          </div>

          <FormField
            control={form.control}
            name="smsCode"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP maxLength={6} {...field}>
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col items-center gap-4">
            <Button type="submit" className="w-full">
              Verify
            </Button>
            <div className="text-sm">
              {countdown > 0 ? (
                <span className="text-neutral-500">
                  Resend code in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                  onClick={handleResend}
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        </form>
      </Form>
    );
  },
};
