import * as React from "react";
import {useForm} from "react-hook-form";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "./form";
import {Input} from "./input";

const meta = {
  title: "Components/Forms/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

function BasicFormDemo(): React.JSX.Element {
  const form = useForm<{username: string; email: string}>({
    defaultValues: {username: "", email: ""},
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // eslint-disable-next-line no-console
          console.log(values);
        })}
        style={{width: 400, display: "flex", flexDirection: "column", gap: 16}}>
        <FormField
          control={form.control}
          name='username'
          rules={{required: "Username is required", minLength: {value: 3, message: "Min 3 characters"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder='johndoe'
                  {...field}
                />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required", pattern: {value: /^\S+@\S+$/i, message: "Invalid email"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='john@example.com'
                  type='email'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Submit</Button>
      </form>
    </Form>
  );
}

/**
 * Default form with react-hook-form validation.
 */
export const Default: Story = {
  render: () => <BasicFormDemo />,
};

function LoginFormDemo(): React.JSX.Element {
  const form = useForm<{email: string; password: string}>({
    defaultValues: {email: "", password: ""},
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // eslint-disable-next-line no-console
          console.log(values);
        })}
        style={{width: 350, display: "flex", flexDirection: "column", gap: 12}}>
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required"}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='john@example.com'
                  type='email'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          rules={{required: "Password is required", minLength: {value: 8, message: "Min 8 characters"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  placeholder='••••••••'
                  type='password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='submit'
          style={{width: "100%"}}>
          Sign In
        </Button>
      </form>
    </Form>
  );
}

/**
 * Login form with email and password fields.
 */
export const LoginForm: Story = {
  render: () => <LoginFormDemo />,
};

function ValidationErrorsFormContent(): React.JSX.Element {
  const form = useForm<{username: string; email: string; password: string}>({
    defaultValues: {username: "", email: "", password: ""},
  });

  const [submitted, setSubmitted] = React.useState(false);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          (values) => {
            // eslint-disable-next-line no-console
            console.log(values);
          },
          () => {
            setSubmitted(true);
          },
        )}
        style={{width: 400, display: "flex", flexDirection: "column", gap: 16}}>
        <FormField
          control={form.control}
          name='username'
          rules={{
            required: "Username is required",
            minLength: {value: 3, message: "Username must be at least 3 characters"},
          }}
          render={({field}) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder='johndoe'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          rules={{
            required: "Email is required",
            pattern: {value: /^\S+@\S+$/i, message: "Please enter a valid email address"},
          }}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='john@example.com'
                  type='email'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          rules={{
            required: "Password is required",
            minLength: {value: 8, message: "Password must be at least 8 characters"},
          }}
          render={({field}) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  placeholder='••••••••'
                  type='password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Submit</Button>
        {submitted && !form.formState.isValid ? (
          <div
            style={{
              padding: "0.75rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "0.875rem",
              color: "#dc2626",
            }}>
            Please fix the errors above before submitting.
          </div>
        ) : null}
      </form>
    </Form>
  );
}

/**
 * Form showing all fields with validation error messages.
 */
export const WithValidationErrors: Story = {
  render: () => <ValidationErrorsFormContent />,
};

function MultiStepFormContent(): React.JSX.Element {
  const [step, setStep] = React.useState(1);
  const form = useForm<{username: string; email: string; password: string; confirmPassword: string}>({
    defaultValues: {username: "", email: "", password: "", confirmPassword: ""},
  });

  return (
    <div style={{width: 400}}>
      <div style={{marginBottom: "1.5rem"}}>
        <div style={{display: "flex", gap: "0.5rem", marginBottom: "1rem"}}>
          <div
            style={{
              flex: 1,
              height: "4px",
              background: step >= 1 ? "#3b82f6" : "#e5e7eb",
              borderRadius: "2px",
              transition: "background 0.3s",
            }}
          />
          <div
            style={{
              flex: 1,
              height: "4px",
              background: step >= 2 ? "#3b82f6" : "#e5e7eb",
              borderRadius: "2px",
              transition: "background 0.3s",
            }}
          />
        </div>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>
          Step {step} of 2: {step === 1 ? "Account Information" : "Security"}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            // eslint-disable-next-line no-console
            console.log(values);
          })}
          style={{display: "flex", flexDirection: "column", gap: 16}}>
          {step === 1 ? (
            <>
              <FormField
                control={form.control}
                name='username'
                rules={{required: "Username is required"}}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='johndoe'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                rules={{required: "Email is required"}}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john@example.com'
                        type='email'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type='button'
                onClick={() => setStep(2)}>
                Next
              </Button>
            </>
          ) : (
            <>
              <FormField
                control={form.control}
                name='password'
                rules={{required: "Password is required"}}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='••••••••'
                        type='password'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                rules={{required: "Please confirm your password"}}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='••••••••'
                        type='password'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div style={{display: "flex", gap: "0.5rem"}}>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setStep(1)}
                  style={{flex: 1}}>
                  Back
                </Button>
                <Button
                  type='submit'
                  style={{flex: 1}}>
                  Submit
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}

/**
 * Multi-step form wizard with progress indicator.
 */
export const MultiStep: Story = {
  render: () => <MultiStepFormContent />,
};
